var Joi = require('joi');
var Promise = require('bluebird');
var words = require('lodash.words');
var jwt = require('jsonwebtoken');
var fs = require('fs');
var path = require('path');
var url = require('url');

var key = fs.readFileSync(path.join(__dirname, '..', 'yoshimi.pem'));

module.exports = function(server) {
  server.route({
    method: 'GET',
    path: '/oauth/authorize',
    handler: function(request, reply) {
      var OAuthClient = request.server.plugins['hapi-mongo-models'].OAuthClient;
      var scopes = words(request.query.scope);
      OAuthClient.checkClient(request.query.client_id, request.query.redirect_uri).then(function(client) {
        if (scopes.indexOf('openid') === -1) {
          return reply(new Error('Request must include openid scope'));
        }

        if (request.query.response_type === 'code') {
          return reply(new Error('Not implemented yet'));
        }
        else {
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
