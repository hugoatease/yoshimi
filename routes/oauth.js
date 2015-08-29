var Joi = require('joi');
var Promise = require('bluebird');
var words = require('lodash.words');
var jwt = require('jsonwebtoken');
var fs = require('fs');
var path = require('path');
var url = require('url');
var includes = require('array-includes');

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

var flows = {
  implicit: function(request, reply) {
    var id_token = jwt.sign({}, key, {
      algorithm: 'RS256',
      expiresInSeconds: 3600 * 24 * 15,
      issuer: server.info.uri,
      subject: request.auth.credentials.username,
      audience: request.query.client_id
    });

    var redirect_uri = url.parse(request.query.redirect_uri);
    if (!redirect_uri.query) redirect_uri.query = {};
    redirect_uri.query.access_token = id_token;
    redirect_uri.query.id_token = id_token;
    redirect_uri.query.token_type = 'JWT';
    redirect_uri.query.expires_in = 3600 * 24 * 15;

    reply.redirect(url.format(redirect_uri));
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
  })
}
