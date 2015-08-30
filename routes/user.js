var _ = require('lodash');
var Joi = require('joi');
var Boom = require('boom');
var bcrypt = require('bcrypt');

module.exports = function(server) {
  server.route({
    method: 'GET',
    path: '/api/user',
    handler: function(request, reply) {
      var User = request.server.plugins['hapi-mongo-models'].User;
      User.findById(request.auth.credentials, function(err, user) {
        if (err) return reply(err);
        reply(_.pick(user, [
          'username', 'email', 'admin', 'email_verified', 'given_name',
          'family_name', 'birthdate', 'phone_number'
        ]));
      });
    },
    config: {
      auth: 'session'
    }
  });

  server.route({
    method: 'PUT',
    path: '/api/user',
    handler: function(request, reply) {
      var User = request.server.plugins['hapi-mongo-models'].User;
      User.findByIdAndUpdate(request.auth.credentials, {$set: request.payload}, function(err, user) {
        if (err) return reply(err);
        reply(_.pick(user, [
          'username', 'email', 'admin', 'email_verified', 'given_name',
          'family_name', 'birthdate', 'phone_number'
        ]));
      });
    },
    config: {
      auth: 'session',
      validate: {
        payload: {
          given_name: Joi.string(),
          family_name: Joi.string(),
          birthdate: Joi.date().iso(),
          phone_number: Joi.phone.e164()
        }
      }
    }
  });

  server.route({
    method: 'POST',
    path: '/api/user/password',
    handler: function(request, reply) {
      var User = request.server.plugins['hapi-mongo-models'].User;
      if (request.payload.password !== request.payload.password_confirm) {
        return reply(Boom.badRequest("Password confirmation doesn't match wanted password"));
      }
      bcrypt.hash(request.payload.password, 10, function(err, hashed) {
        User.findByIdAndUpdate(request.auth.credentials, {$set: {password: hashed}}, function(err, result) {
          if (err) return reply(err);
          reply('Password has been successfuly updated');
        })
      });
    },
    config: {
      auth: 'session',
      validate: {
        payload: {
          password: Joi.string().min(6).required(),
          password_confirm: Joi.string().min(6).required()
        }
      }
    }
  })
}
