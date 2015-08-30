var _ = require('lodash');
var Joi = require('joi');

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
    handler: function() {
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
  })
}
