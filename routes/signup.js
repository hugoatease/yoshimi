var Hapi = require('hapi');
var Joi = require('joi');
var bcrypt = require('bcrypt');

module.exports = function(server) {
  server.route({
    method: 'GET',
    path: '/signup',
    handler: function(request, reply) {
      reply.view('signup', {
        errors: request.session.flash('error')
      });
    }
  });

  server.route({
    method: 'POST',
    path: '/signup',
    handler: function(request, reply) {
      if (request.payload.password !== request.payload.password_confirm) {
        request.session.flash('error', "Password confirmation doesn't match wanted password");
        return reply.redirect('/signup');
      }

      var User = request.server.plugins['hapi-mongo-models'].User;
      User.count({$or: [{username: request.payload.username}, {email: request.payload.email}]}, function(err, count) {
        if (err || count > 0) {
          request.session.flash('error', "Username or email is already registered");
          return reply.redirect('/signup');
        }

        bcrypt.hash(request.payload.password, 10, function(err, hashed) {
          User.insertOne({
            username: request.payload.username,
            password: hashed,
            email: request.payload.email
          }, function(err, results) {
            return reply('Succesful sign up');
          })
        })
      })

    },
    config: {
      validate: {
        payload: {
          username: Joi.string().lowercase().required(),
          password: Joi.string().min(6).required(),
          password_confirm: Joi.string().min(6).required(),
          email: Joi.string().email()
        },
        failAction: function(request, reply, source, error) {
          error.data.details.forEach(function(item) {
            request.session.flash('error', item.message);
          }.bind(this));
          reply.redirect('/signup');
        }
      }
    }
  });
}
