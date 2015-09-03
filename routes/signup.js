var Hapi = require('hapi');
var Joi = require('joi');
var Boom = require('boom');
var bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');
var url = require('url');
var config = require('config');

module.exports = function(server) {
  server.route({
    method: 'GET',
    path: '/signup',
    handler: function(request, reply) {
      if (!config.get('email_validation_mandatory')) {
        reply.view('signup', {
          errors: request.session.flash('error')
        });
      }
      else {
        if (!request.query.email_token) {
          reply.view('signup', {
            errors: request.session.flash('error'),
            email_only: true
          });
        }
        else {
          reply.view('signup', {
            errors: request.session.flash('error'),
            email_token: request.query.email_token
          });
        }
      }
    }
  });

  function registerUser(server, request, reply, email, verified) {
    var User = request.server.plugins['hapi-mongo-models'].User;
    User.count({$or: [{username: request.payload.username}, {email: email, email_verified: true}]}, function(err, count) {
      if (err || count > 0) {
        request.session.flash('error', "Username or email is already registered");
        return reply.redirect(request.to('signup'));
      }

      bcrypt.hash(request.payload.password, 10, function(err, hashed) {
        User.insertOne({
          username: request.payload.username,
          password: hashed,
          email: email,
          email_verified: verified
        }, function(err, results) {
          server.methods.sendValidation(server, request, results[0]._id, results[0].email).then(function() {
            reply('Signup success');
          });
        });
      });
    });
  }

  server.route({
    method: 'POST',
    path: '/signup',
    handler: function(request, reply) {
      var User = request.server.plugins['hapi-mongo-models'].User;

      if (config.get('email_validation_mandatory') && request.payload.email) {
        User.count({email: request.payload.email, email_verified: true}, function(err, count) {
          if (err || count > 0) {
            return reply('Email address is already used by a registered user');
          }
          var token = jwt.sign({email: request.payload.email}, config.get('secret'), {
            expiresInSeconds: config.get('expirations.email_validation'),
            issuer: server.info.uri,
            audience: server.info.uri
          });
          var verification_url = request.to('signup', {query: {email_token: token}});
          var Mailer = server.plugins.mailer;
          Mailer.sendMail({
            from: 'noreply@musicpicker.net',
            to: request.payload.email,
            subject: config.get('name') + ' - Email validation',
            html: {path: 'emails/validation.hbs'},
            context: {url: verification_url}
          });
          return reply('Check your inbox in order to continue signup.');
        });
      }
      else {
        if (request.payload.password !== request.payload.password_confirm) {
          request.session.flash('error', "Password confirmation doesn't match wanted password");
          return reply.redirect(request.to('signup'));
        }

        if (config.get('email_validation_mandatory')) {
          jwt.verify(request.payload.email_token, config.get('secret'), {
            issuer: server.info.uri,
            audience: server.info.uri
          }, function(err, data) {
            if (err) {
              return reply('Incorrect email validation token');
            }
            registerUser(server, request, reply, data.email, true);
          });
        }
        else {
          registerUser(server, request, reply, request.payload.email, false);
        }
      }
    },
    config: {
      id: 'signup',
      validate: {
        payload: {
          username: Joi.string().lowercase(),
          password: Joi.string().min(6),
          password_confirm: Joi.string().min(6),
          email: Joi.string().email(),
          email_token: Joi.string()
        },
        failAction: function(request, reply, source, error) {
          error.data.details.forEach(function(item) {
            request.session.flash('error', item.message);
          }.bind(this));
          reply.redirect(request.to('signup', {query: request.query}));
        }
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/email_verification',
    handler: function(request, reply) {
      jwt.verify(request.query.token, config.get('secret'), {
        issuer: server.info.uri,
        audience: server.info.uri
      }, function(err, data) {
        if (err) {
          return reply(Boom.unauthorized('Invalid verification token'));
        }
        var User = request.server.plugins['hapi-mongo-models'].User;
        User.count({email: data.email, email_verified: true}, function(err, verified) {
          if (err) return reply(err);
          if (verified > 0) {
            return reply(Boom.unauthorized('Email adress has already been verified'));
          }
          User.findById(data.sub, function(err, user) {
            if (err) return reply(err);
            if (user.email !== data.email) {
              return reply(Boom.unauthorized('Token email doesn\'t match user email address'));
            }
            User.updateOne({_id: User.ObjectId(data.sub), email: data.email}, {$set: {email_verified: true}}, function(err, updated) {
              if (err) return reply(err);
              reply('Email has been successfully verified');
            });
          })
        })
      })
    },
    config: {
      id: 'email_verification',
      validate: {
        query: {
          token: Joi.string().required()
        }
      }
    }
  })
}
