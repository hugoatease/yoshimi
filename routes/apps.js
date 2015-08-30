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
      OAuthClient.find({owner: request.auth.credentials}, function(err, result) {
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
        var client = request.payload;
        client.client_id = props.client_id;
        client.client_secret = props.client_secret;
        client.owner = request.auth.credentials;
        OAuthClient.insertOne(client, function(err, result) {
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
          redirect_uri: Joi.string().uri({scheme: ['http', 'https']}),
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
      OAuthClient.findOne({_id: OAuthClient.ObjectId(request.params.id), owner: request.auth.credentials}, function(err, result) {
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
      OAuthClient.deleteOne({_id: OAuthClient.ObjectId(request.params.id), owner: request.auth.credentials}, function(err) {
        reply(204);
      });
    },
    config: {
      auth: 'session'
    }
  })

  server.route({
    method: 'PUT',
    path: '/api/apps/{id}',
    handler: function(request, reply) {
      var OAuthClient = request.server.plugins['hapi-mongo-models'].OAuthClient;
      OAuthClient.updateOne({_id: OAuthClient.ObjectId(request.params.id), owner: request.auth.credentials}, {$set: request.payload}, function(err) {
        if (err) return reply(err);
        reply(200);
      })
    },
    config: {
      auth: 'session',
      validate: {
        payload: {
          description: Joi.string(),
          redirect_uri: Joi.string().uri({scheme: ['http', 'https']}),
          enable_grant_token: Joi.boolean()
        }
      }
    }
  })
}
