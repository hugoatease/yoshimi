var Promise = require('bluebird');
var uid = require('uid-safe');
var Boom = require('boom');
var Joi = require('joi');

module.exports = function(server) {
  server.route({
    method: 'GET',
    path: '/api/apps',
    handler: function(request, reply) {
      var OAuthClient = request.server.plugins['hapi-mongo-models'].OAuthClient;
      OAuthClient.find({owner: request.auth.credentials._id}, function(err, result) {
        reply(result);
      })
    },
    config: {
      auth: 'session'
    }
  })

  server.route({
    method: 'POST',
    path: '/api/apps',
    handler: function(request, reply) {
      var OAuthClient = request.server.plugins['hapi-mongo-models'].OAuthClient;
      Promise.props({
        client_id: uid(42),
        client_secret: uid(42)
      }).then(function(props) {
        OAuthClient.insertOne({
          client_id: client_id,
          client_secret: client_secret,
          owner: request.auth.credentials._id,
          name: request.payload.name,
          description: request.payload.description,
          redirect_uri: request.payload.redirect_uri,
          enable_grant_token: request.payload.enable_grant_token
        }, function(err, result) {
          reply(result);
        })
      })
    },
    config: {
      auth: 'session',
      validate: {
        payload: {
          name: Joi.string().required(),
          description: Joi.string(),
          redirect_uri: Joi.uri({scheme: [http, https]}),
          enable_grant_token: Joi.boolean()
        }
      }
    }
  })

  server.route({
    method: 'GET',
    path: '/api/apps/{id}',
    handler: function(request, reply) {
      var OAuthClient = request.server.plugins['hapi-mongo-models'].OAuthClient;
      OAuthClient.findOne({_id: request.params.id, owner: request.auth.credentials._id}, function(err, result) {
        if (!result) {
          reply(Boom.notFound())
        }
        else {
          reply(result);
        }
      });
    },
    config: {
      auth: 'session'
    }
  })

  server.route({
    method: 'DELETE',
    path: '/api/apps/{id}',
    handler: function(request, reply) {
      var OAuthClient = request.server.plugins['hapi-mongo-models'].OAuthClient;
      OAuthClient.deleteOne({_id: request.params.id, owner: request.auth.credentials._id}, function(err) {
        reply(204);
      });
    }
  })
}
