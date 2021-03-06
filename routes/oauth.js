var Joi = require('joi');
var Boom = require('boom');
var Promise = require('bluebird');
var jwt = require('jsonwebtoken');
var fs = require('fs');
var path = require('path');
var url = require('url');
var urlencode = require('urlencode');
var includes = require('array-includes');
var uid = require('uid-safe');
var _ = require('lodash');
var config = require('config');

var redis = require('then-redis').createClient(config.get('redis'));

var key = config.get('key');
var OAuthClient = require('../models/oauthClient');

var scopeClaims = {
  profile: [
    'name', 'family_name', 'given_name', 'middle_name', 'nickname', 'preferred_username',
    'profile', 'picture', 'website', 'gender', 'birthdate', 'zoneinfo', 'locale', 'updated_at'
  ],
  email: ['email', 'email_verified'],
  address: ['address'],
  phone: ['phone_number', 'phone_number_verified']
}


function trimValues(values) {
  return values.split(' ').filter(function(value) { return value; });
}

function checkClient(server, client_id, redirect_uri) {
  return new Promise(function(resolve, reject) {
    if (!config.get('use_etcd')) {
      OAuthClient.findOne({client_id: client_id, redirect_uri: redirect_uri}, function(err, result) {
        if (err) return reject(err);
        if (!result) {
          reject(Boom.unauthorized('Client not found'));
        }
        else {
          resolve(result);
        }
      })
    }
    else {
      server.methods.etcdClient(client_id).then(function(client) {
        if (!client) {
          reject(Boom.unauthorized('Client not found'));
        }
        else {
          if (client.redirect_uri !== redirect_uri) {
            reject(Boom.unauthorized('Client not found'));
          }
          else {
            resolve(client);
          }
        }
      });
    }
  }.bind(this));
}

function createBearer(client_id, user_id, scope, refresh) {
  return new Promise(function(resolve, reject) {
    uid(16).then(function(bearer) {
      Promise.all([
        redis.set('yoshimi.oauth.token.' + bearer + '.client', client_id),
        redis.set('yoshimi.oauth.token.' + bearer + '.user', user_id),
        redis.set('yoshimi.oauth.token.' + bearer + '.scope', scope),
        redis.expire('yoshimi.oauth.token.' + bearer + '.client', config.get('expirations.bearer')),
        redis.expire('yoshimi.oauth.token.' + bearer + '.client', config.get('expirations.bearer')),
        redis.expire('yoshimi.oauth.token.' + bearer + '.client', config.get('expirations.bearer'))
      ]).then(function() {
        if (refresh) {
          uid(16).then(function(refresh_token) {
            Promise.all([
              redis.set('yoshimi.oauth.refresh_token.' + refresh_token, bearer),
              redis.expire('yoshimi.oauth.refresh_token.' + refresh_token, config.get('expirations.bearer'))
            ]).then(function() {
              resolve({
                bearer: bearer,
                refresh: refresh_token,
                expires: config.get('expirations.bearer')
              })
            });
          });
        }
        else {
          resolve({
            bearer: bearer,
            expires: config.get('expirations.bearer')
          })
        }
      });
    });
  });
}

function createIdToken(server, client_id, user_id, nonce) {
  return new Promise(function(resolve, reject) {
    var User = server.plugins['hapi-mongo-models'].User;
    User.findById(user_id, function(err, result) {
      payload = {};
      if (nonce) {
        payload.nonce = nonce;
      }

      if (result.facebook_token) {
        payload.facebook_token = result.facebook_token;
      }

      return resolve(jwt.sign(payload, key, {
        algorithm: 'RS256',
        expiresInSeconds: config.get('expirations.id_token'),
        issuer: config.get('issuer_url'),
        subject: user_id,
        audience: client_id
      }));
    });
  });
}

var flows = {
  code: function(server, request, reply) {
    uid(16).then(function(code) {
      Promise.all([
        redis.set('yoshimi.oauth.code.' + request.query.client_id + '.' + code + '.user', request.auth.credentials),
        redis.expire('yoshimi.oauth.code.' + request.query.client_id + '.' + code + '.user', config.get('expirations.access_code')),
        redis.set('yoshimi.oauth.code.' + request.query.client_id + '.' + code + '.redirect_uri', request.query.redirect_uri),
        redis.expire('yoshimi.oauth.code.' + request.query.client_id + '.' + code + '.redirect_uri', config.get('expirations.access_code')),
        redis.set('yoshimi.oauth.code.' + request.query.client_id + '.' + code + '.scope', request.query.scope),
        redis.expire('yoshimi.oauth.code.' + request.query.client_id + '.' + code + '.scope', config.get('expirations.access_code'))
      ]).then(function() {
        function sendResult() {
          var redirect_uri = url.parse(request.query.redirect_uri);
          if (!redirect_uri.query) redirect_uri.query = {};
          redirect_uri.query.code = code;
          if (request.query.state) {
            redirect_uri.query.state = request.query.state;
          }
          reply.redirect(url.format(redirect_uri));
        }

        if (request.query.nonce) {
          Promise.all([
            redis.set('yoshimi.oauth.code.' + request.query.client_id + '.' + code + '.nonce', request.query.nonce),
            redis.expire('yoshimi.oauth.code.' + request.query.client_id + '.' + code + '.nonce', config.get('expirations.access_code'))
          ]).then(function() {
            sendResult();
          })
        }
        else {
          sendResult();
        }
      })
    })
  },

  implicit: function(server, request, reply) {
    if (!request.query.nonce) {
      return oauthError(request, reply, 'invalid_request', 'nonce parameter must be provided');
    }
    createBearer(request.query.client_id, request.auth.credentials, request.query.scope).then(function(bearer) {
      createIdToken(server, request.query.client_id, request.auth.credentials, request.query.nonce).then(function(id_token) {
        var redirect_uri = url.parse(request.query.redirect_uri);

        var hash = {
          access_token: bearer.bearer,
          id_token: id_token,
          token_type: 'Bearer',
          expires_in: bearer.expires
        };

        if (request.query.state) {
          hash.state = request.query.state;
        }

        redirect_uri.hash = urlencode.stringify(hash);

        reply.redirect(url.format(redirect_uri));
      });
    });
  }
}

var grants = {
  authorization_code: function(server, request, reply) {
    Promise.props({
      user: redis.get('yoshimi.oauth.code.' + request.auth.credentials.client_id + '.' + request.payload.code + '.user'),
      storedRedirect: redis.get('yoshimi.oauth.code.' + request.auth.credentials.client_id + '.' + request.payload.code + '.redirect_uri'),
      scope: redis.get('yoshimi.oauth.code.' + request.auth.credentials.client_id + '.' + request.payload.code + '.scope'),
      nonce: redis.get('yoshimi.oauth.code.' + request.auth.credentials.client_id + '.' + request.payload.code + '.nonce')
    }).then(function(props) {
      Promise.all([
        redis.del('yoshimi.oauth.code.' + request.auth.credentials.client_id + '.' + request.payload.code + '.user'),
        redis.del('yoshimi.oauth.code.' + request.auth.credentials.client_id + '.' + request.payload.code + '.redirect_uri'),
        redis.del('yoshimi.oauth.code.' + request.auth.credentials.client_id + '.' + request.payload.code + '.scope'),
        redis.del('yoshimi.oauth.code.' + request.auth.credentials.client_id + '.' + request.payload.code + '.nonce')
      ]).then(function() {
        if (!props.user) {
          return reply({
            error: 'invalid_grant',
            error_description: 'Invalid authorization code'
          }).code(400);
        }

        var hasRefresh = includes(trimValues(props.scope), 'offline_access');

        createBearer(request.auth.credentials.client_id, props.user, props.scope, hasRefresh).then(function(bearer) {
          createIdToken(server, request.auth.credentials.client_id, props.user, props.nonce).then(function(id_token) {
            var result = {
              access_token: bearer.bearer,
              id_token: id_token,
              token_type: 'Bearer',
              expires_in: bearer.expires
            }
            if (hasRefresh) result.refresh_token = bearer.refresh;
            reply(result);
          });
        });
      });
    }).catch(function() {
      return reply({
        error: 'invalid_grant',
        error_description: 'Invalid authorization code'
      }).code(400);
    });
  },

  refresh_token: function(server, request, reply) {
    if (!request.payload.refresh_token) {
      return reply({
        error: 'invalid_request',
        error_description: 'refresh_token must be provided'
      }).code(400);
    }
    if (!request.payload.scope || !includes(trimValues(request.payload.scope), 'openid')) {
      return reply({
        error: 'invalid_request',
        error_description: 'Request must include openid scope'
      }).code(400);
    }
    redis.get('yoshimi.oauth.refresh_token.' + request.payload.refresh_token).then(function(bearer) {
      Promise.props({
        client: redis.get('yoshimi.oauth.token.' + bearer + '.client'),
        user: redis.get('yoshimi.oauth.token.' + bearer + '.user'),
        scope: redis.get('yoshimi.oauth.token.' + bearer + '.scope')
      }).then(function(props) {
        if (request.auth.credentials.client_id !== props.client) {
          return reply({
            error: 'invalid_grant',
            error_description: 'refresh_token does not belong to client'
          }).code(400);
        }
        if (_.difference(trimValues(request.payload.scope), trimValues(props.scope)).length > 0) {
          return reply({
            error: 'invalid_request',
            error_description: 'Requested scopes are broader than originally issued'
          }).code(400);
        }
        Promise.all([
          redis.del('yoshimi.oauth.token.' + bearer + '.client'),
          redis.del('yoshimi.oauth.token.' + bearer + '.user'),
          redis.del('yoshimi.oauth.token.' + bearer + '.scope'),
          redis.del('yoshimi.oauth.refresh_token.' + request.payload.refresh_token)
        ]).then(function() {
          createBearer(request.auth.credentials.client_id, props.user, props.scope, true).then(function(bearer) {
            createIdToken(server, request.auth.credentials.client_id, props.user).then(function(id_token) {
              reply({
                access_token: bearer.bearer,
                refresh_token: bearer.refresh,
                id_token: id_token,
                token_type: 'Bearer',
                expires_in: bearer.expires
              });
            });
          })
        });
      });
    }).catch(function() {
      return reply({
        error: 'invalid_grant',
        error_description: 'Invalid refresh_token'
      }).code(400);
    });
  }
}

function matchFlow(response_type) {
  var types = trimValues(response_type);
  if (includes(types, 'code') && !includes(types, 'id_token') && !includes(types, 'token')) {
    return 'code';
  }
  if (includes(types, 'id_token') && !includes(types, 'code') && !includes(types, 'token')) {
    return 'implicit';
  }
  if (includes(types, 'id_token') && includes(types, 'token') && !includes(types, 'code')) {
    return 'implicit';
  }
  if (includes(types, 'code') && includes(types, 'id_token') && !includes(types, 'token')) {
    return 'hybrid';
  }
  if (includes(types, 'code') && includes(types, 'token') && !includes(types, 'id_token')) {
    return 'hybrid';
  }
  if (includes(types, 'code') && includes(types, 'id_token') && includes(types, 'token')) {
    return 'hybrid';
  }
  return null;
}

function oauthError(request, reply, error, detail) {
  var redirect_uri = url.parse(request.query.redirect_uri);
  if (!redirect_uri.query) {
    redirect_uri.query = {};
  }
  redirect_uri.query.error = error;
  if (detail) {
    redirect_uri.query.error_description = detail;
  }
  if (request.query.state) {
    redirect_uri.query.state = request.query.state;
  }
  reply.redirect(url.format(redirect_uri));
}

module.exports = function(server) {
  server.route({
    method: 'GET',
    path: '/oauth/authorize',
    handler: function(request, reply) {
      if (!request.query.scope || !includes(trimValues(request.query.scope), 'openid')) {
        return oauthError(request, reply, 'invalid_scope', 'Request must include openid scope');
      }
      var scopes = trimValues(request.query.scope);
      checkClient(request.server, request.query.client_id, request.query.redirect_uri).then(function(client) {
        var flow = matchFlow(request.query.response_type);
        if (!flow) {
          return oauthError(request, reply, 'invalid_request', 'Invalid response_type');
        }
        if (!flows[flow]) {
          return oauthError(request, reply, 'unsupported_response_type', flow + ' flow not supported');
        }

        return flows[flow](server, request, reply);
      }).catch(function(err) {
        return oauthError(request, reply, 'invalid_client');
      });
    },
    config: {
      id: 'authorization',
      auth: 'session',
      validate: {
        query: {
          scope: Joi.string().required(),
          response_type: Joi.string().required(),
          client_id: Joi.string().required(),
          redirect_uri: Joi.string().required().uri({scheme: ['http', 'https']}),
          state: Joi.string(),
          nonce: Joi.string(),
          signup_redirect: Joi.boolean()
        },
        failAction: function(request, reply, source, error) {
          return oauthError(request, reply, 'invalid_request');
        }
      }
    }
  });

  server.route({
    method: 'POST',
    path: '/oauth/token',
    handler: function(request, reply) {
      if (!grants[request.payload.grant_type]) {
        return oauthError(request, reply, 'unsupported_grant_type', 'Unknown grant_type ' + request.payload.grant_type);
      }
      grants[request.payload.grant_type](server, request, reply);
    },
    config: {
      id: 'token',
      auth: 'basic',
      validate: {
        payload: {
          grant_type: Joi.string().required().valid(['authorization_code', 'refresh_token']),
          code: Joi.string(),
          redirect_uri: Joi.string(),
          client_id: Joi.string(),
          scope: Joi.string(),
          refresh_token: Joi.string()
        },
        failAction: function(request, reply, source, error) {
          return reply.code(400);
        }
      }
    }
  });

  function userInfo(request, reply) {
    var User = request.server.plugins['hapi-mongo-models'].User;
    User.findById(request.auth.credentials.user_id, function(err, user) {
      if (err) return err;

      var scopes = trimValues(request.auth.credentials.scope);
      var result = {
        sub: user._id
      }

      scopes.forEach(function(scope) {
        _.merge(result, _.pick(user, scopeClaims[scope]));
      }.bind(this));

      if (includes(trimValues(request.auth.credentials.scope), 'profile')) {
        result.preferred_username = user.username;
        if (includes(user, 'given_name') && includes(user, 'family_name')) {
          result.name = user.given_name + ' ' + user.family_name;
        }
      }

      reply(result);
    })
  }

  server.route({
    method: 'GET',
    path: '/oauth/userinfo',
    handler: userInfo,
    config: {
      id: 'userinfo',
      auth: 'bearer'
    }
  });

  server.route({
    method: 'POST',
    path: '/oauth/userinfo',
    handler: userInfo,
    config: {
      auth: 'bearer'
    }
  });
}
