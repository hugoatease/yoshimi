var Joi = require('joi');
var Promise = require('bluebird');
var words = require('lodash.words');
var jwt = require('jsonwebtoken');
var fs = require('fs');
var path = require('path');
var url = require('url');
var includes = require('array-includes');
var uid = require('uid-safe');

var redis = require('then-redis').createClient();

var key = fs.readFileSync(path.join(__dirname, '..', 'yoshimi.pem'));
var OAuthClient = require('../models/oauthClient');

function checkClient(client_id, redirect_uri) {
  return new Promise(function(resolve, reject) {
    OAuthClient.findOne({client_id: client_id, redirect_uri: redirect_uri}, function(err, result) {
      if (err) return reject(err);
      if (!result) {
        reject(new Error('Client not found'));
      }
      else {
        resolve(result);
      }
    })
  }.bind(this));
}

function createIdToken(request) {
  return jwt.sign({}, key, {
    algorithm: 'RS256',
    expiresInSeconds: 3600 * 24 * 15,
    issuer: server.info.uri,
    subject: request.auth.credentials.username,
    audience: request.query.client_id
  });
}

var flows = {
  code: function(request, reply) {
    uid(16).then(function(code) {
      Promise.all([
        redis.set('yoshimi.oauth.' + request.query.client_id + '.' + code + '.user', request.auth.credentials._id),
        redis.expire('yoshimi.oauth.' + request.query.client_id + '.' + code + '.user', 60),
        redis.set('yoshimi.oauth.' + request.query.client_id + '.' + code + '.redirect_uri', request.query.redirect_uri),
        redis.expire('yoshimi.oauth.' + request.query.client_id + '.' + code + '.redirect_uri', 60)
      ]).then(function() {
        var redirect_uri = url.parse(request.query.redirect_uri);
        if (!redirect_uri.query) redirect_uri.query = {};
        redirect_uri.query.code = code;
        reply.redirect(url.format(redirect_uri));
      })
    })
  },

  implicit: function(request, reply) {
    var id_token = createIdToken(request);
    var redirect_uri = url.parse(request.query.redirect_uri);
    if (!redirect_uri.query) redirect_uri.query = {};
    redirect_uri.query.access_token = id_token;
    redirect_uri.query.id_token = id_token;
    redirect_uri.query.token_type = 'JWT';
    redirect_uri.query.expires_in = 3600 * 24 * 15;

    reply.redirect(url.format(redirect_uri));
  }
}

var grants = {
  authorization_code: function(request, reply) {
    if (!request.payload.redirect_uri) {
      return reply(new Error('redirect_uri must be provided'));
    }
    Promise.props({
      user: redis.get('yoshimi.oauth.' + request.query.client_id + '.' + code + '.user'),
      storedRedirect: redis.get('yoshimi.oauth.' + request.query.client_id + '.' + code + '.redirect_uri')
    }).then(function(props) {
      Promise.all([
        redis.del('yoshimi.oauth.' + request.query.client_id + '.' + code + '.user'),
        redis.del('yoshimi.oauth.' + request.query.client_id + '.' + code + '.redirect_uri')
      ]).then(function() {
        if (!props.user) {
          return reply(new Error('Invalid authorization code'));
        }
        if (props.storedRedirect !== request.query.redirect_uri) {
          return reply(new Error('Authorization code redirect_uri differs from provided redirect_uri'));
        }

        var id_token = createIdToken(request);
        reply({
          access_token: id_token,
          id_token: id_token,
          token_type: 'JWT',
          expires_in: 3600 * 24 * 15
        })
      });
    });
  }
}

function matchFlow(response_type) {
  var types = words(response_type);
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

module.exports = function(server) {
  server.route({
    method: 'GET',
    path: '/oauth/authorize',
    handler: function(request, reply) {
      var OAuthClient = request.server.plugins['hapi-mongo-models'].OAuthClient;
      var scopes = words(request.query.scope);
      checkClient(request.query.client_id, request.query.redirect_uri).then(function(client) {
        if (!includes(scopes, 'openid')) {
          return reply(new Error('Request must include openid scope'));
        }

        var flow = matchFlow(request.query.response_type);
        if (!flow) {
          return reply(new Error('Invalid response_type'));
        }
        if (!flows[flow]) {
          return reply(new Error(flow + ' flow not supported'));
        }

        return flows[flow](request, reply);
      }).catch(function(err) {
        reply(err);
      });
    },
    config: {
      auth: 'session',
      validate: {
        query: {
          scope: Joi.string().required(),
          response_type: Joi.string().required().valid(['code', 'token']),
          client_id: Joi.string().required(),
          redirect_uri: Joi.string().required().uri({scheme: ['http', 'https']})
        }
      }
    }
  });

  server.route({
    method: 'POST',
    path: '/oauth/token',
    handler: function(request, reply) {
      if (!grants[request.payload.grant_type]) {
        return reply(new Error('Unknown grant_type ' + request.payload.grant_type));
      }
      grants[request.payload.grant_type](request, reply);
    },
    config: {
      auth: 'simple',
      validate: {
        payload: {
          grant_type: Joi.string().required(),
          code: Joi.string(),
          redirect_uri: Joi.string(),
          client_id: Joi.string()
        }
      }
    }
  })
}
