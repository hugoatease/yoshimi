var Hapi = require('hapi');
var Joi = require('joi');
var Boom = require('boom');
var bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');
var url = require('url');
var config = require('config');
var acceptLanguage = require('accept-language');
acceptLanguage.languages(['en', 'fr']);

module.exports = function(server) {
  server.route({
    method: 'GET',
    path: '/signup',
    handler: function(request, reply) {
      var OAuthClient = request.server.plugins['hapi-mongo-models'].OAuthClient;
      if (!config.get('email_validation_mandatory')) {
        if (request.session.get('oauth_client')) {
          OAuthClient.findOne({client_id: request.session.get('oauth_client')}, function(err, client) {
            if (err) return;
            reply.view('signup', {
              errors: request.session.flash('error'),
              logo_url: config.get('logo_url'),
              lang: acceptLanguage.get(request.headers['accept-language']),
              client_name: client.name
            });
          });
        }
        else {
          reply.view('signup', {
            errors: request.session.flash('error'),
            logo_url: config.get('logo_url'),
            lang: acceptLanguage.get(request.headers['accept-language'])
          });
        }
      }
      else {
        if (!request.query.email_token) {
          if (request.session.get('oauth_client')) {
            OAuthClient.findOne({client_id: request.session.get('oauth_client')}, function(err, client) {
              if (err) return;
              reply.view('signup', {
                errors: request.session.flash('error'),
                email_only: true,
                validation_sent: request.query.validation_sent,
                logo_url: config.get('logo_url'),
                lang: acceptLanguage.get(request.headers['accept-language']),
                client_name: client.name
              });
            });
          }
          else {
            reply.view('signup', {
              errors: request.session.flash('error'),
              email_only: true,
              validation_sent: request.query.validation_sent,
              logo_url: config.get('logo_url'),
              lang: acceptLanguage.get(request.headers['accept-language'])
            });
          }
        }
        else {
          reply.view('signup', {
            errors: request.session.flash('error'),
            email_token: request.query.email_token,
            logo_url: config.get('logo_url'),
            lang: acceptLanguage.get(request.headers['accept-language'])
          });
        }
      }
      request.session.clear('oauth_client');
    },
    config: {
      id: 'signup'
    }
  });

  function registerUser(server, request, reply, email, verified) {
    var User = request.server.plugins['hapi-mongo-models'].User;
    User.count({email: email}, function(err, count) {
      if (err || count > 0) {
        request.session.flash('error', "Email is already registered");
        return reply.redirect(request.to('signup'));
      }

      bcrypt.hash(request.payload.password, 10, function(err, hashed) {
        User.insertOne({
          given_name: request.payload.firstname,
          family_name: request.payload.lastname,
          password: hashed,
          email: email,
          email_verified: verified,
        }, function(err, results) {
          server.methods.sendValidation(server, request, results[0]._id, results[0].email, acceptLanguage.get(request.headers['accept-language'])).then(function() {
            var login_redirect = request.session.get('login_redirect');
            if (login_redirect) {
              request.auth.session.set(results[0]._id);
              request.session.clear('login_redirect');
              reply.redirect(login_redirect);
            }
            else {
              reply.redirect(request.to('index'));
            }
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
        User.count({email: request.payload.email}, function(err, count) {
          if (err || count > 0) {
            request.session.flash('error', "Email address is already used by a registered user");
            return reply.redirect(request.to('signup'));
          }
          var token = jwt.sign({email: request.payload.email}, config.get('secret'), {
            expiresInSeconds: config.get('expirations.email_validation'),
            issuer: config.get('issuer_url'),
            audience: config.get('issuer_url')
          });
          var verification_url = request.to('signup', {query: {email_token: token}});
          var Mailer = server.plugins.mailer;
          Mailer.sendMail({
            from: config.get('server_email'),
            to: request.payload.email,
            subject: config.get('name') + ' - Email validation',
            html: {path: 'emails/validation.hbs'},
            context: {url: verification_url}
          });
          return reply.redirect(request.to('signup', {query: {validation_sent: true}}));
        });
      }
      else {
        if (request.payload.password !== request.payload.password_confirm) {
          request.session.flash('error', "Password confirmation doesn't match wanted password");
          return reply.redirect(request.to('signup'));
        }

        if (config.get('email_validation_mandatory')) {
          jwt.verify(request.payload.email_token, config.get('secret'), {
            issuer: config.get('issuer_url'),
            audience: config.get('issuer_url')
          }, function(err, data) {
            if (err) {
              request.session.flash('error', "Incorrect email validation token");
              return reply.redirect(request.to('signup'));
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
      validate: {
        payload: {
          username: Joi.string().lowercase(),
          password: Joi.string().min(6),
          password_confirm: Joi.string().min(6),
          email: Joi.string().email(),
          email_token: Joi.string(),
          firstname: Joi.string(),
          lastname: Joi.string()
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
        issuer: config.get('issuer_url'),
        audience: config.get('issuer_url')
      }, function(err, data) {
        if (err) {
          return reply.view('validation', {
            success: false,
            error: 'Invalid verification token',
            logo_url: config.get('logo_url'),
            lang: acceptLanguage.get(request.headers['accept-language'])
          })
        }
        var User = request.server.plugins['hapi-mongo-models'].User;
        User.count({email: data.email, email_verified: true}, function(err, verified) {
          if (err) return reply(err);
          if (verified > 0) {
            return reply.view('validation', {
              success: false,
              error: 'Email adress has already been verified',
              logo_url: config.get('logo_url'),
              lang: acceptLanguage.get(request.headers['accept-language'])
            });
          }
          User.updateOne({_id: User.ObjectId(data.sub)}, {$set: {email: data.email, email_verified: true}}, function(err, updated) {
            if (err) return reply(err);
            return reply.view('validation', {
              success: true,
              logo_url: config.get('logo_url'),
              lang: acceptLanguage.get(request.headers['accept-language'])
            });
          });
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
