var Joi = require('joi');
var jwt = require('jsonwebtoken');
var url = require('url');
var bcrypt = require('bcrypt');
var config = require('config');

module.exports = function(server) {
  server.route({
    method: 'GET',
    path: '/password_recovery',
    handler: function(request, reply) {
      reply.view('recovery', {
        errors: request.session.flash('error'),
        token: request.query.token,
        logo_url: config.get('logo_url'),
        proceed_url: request.to('password_recovery_proceed')
      });
    },
    config: {
      id: 'recovery'
    }
  });

  server.route({
    method: 'POST',
    path: '/password_recovery',
    handler: function(request, reply) {
      var User = request.server.plugins['hapi-mongo-models'].User;
      User.findOne({email: request.payload.email, email_verified: true}, function(err, user) {
        if (err) return reply(err);
        if (!user) {
          request.session.flash('error', 'Email address is not associated with any user');
          return reply.redirect(request.to('password_recovery'));
        }
        var token = jwt.sign({}, config.get('secret'), {
          algorithm: 'HS256',
          subject: user._id,
          issuer: config.get('issuer_url'),
          audience: config.get('issuer_url'),
          expiresInSeconds: config.get('expirations.account_recovery')
        });
        var Mailer = request.server.plugins.mailer;
        var verification_url = request.to('password_recovery', {query: {token: token}});
        Mailer.sendMail({
          from: config.get('server_email'),
          to: user.email,
          subject: config.get('name') + ' - Password recovery',
          html: {path: 'emails/recovery.hbs'},
          context: {url: verification_url}
        }, function() {
          reply.view('recovery', {
            success: 'Recovery email has been sent.',
            logo_url: config.get('logo_url')
          })
        });
      });
    },
    config: {
      id: 'password_recovery',
      validate: {
        payload: {
          email: Joi.string().email().required()
        }
      }
    }
  });

  server.route({
    method: 'POST',
    path: '/password_recovery_proceed',
    handler: function(request, reply) {
      if (request.payload.password !== request.payload.password_confirm) {
        request.session.flash('error', "Password confirmation doesn't match wanted password");
        return reply.redirect(request.to('password_recovery', {query: {token: request.payload.token}}));
      }

      jwt.verify(request.payload.token, config.get('secret'), {
        issuer: config.get('issuer_url'),
        audience: config.get('issuer_url'),
      }, function(err, decoded) {
        if (err) {
          request.session.flash('error', "Provided recovery token is invalid");
          return reply.redirect(request.to('password_recovery', {query: {token: request.payload.token}}));
        }

        var User = request.server.plugins['hapi-mongo-models'].User;
        bcrypt.hash(request.payload.password, 10, function(err, hashed) {
          User.findByIdAndUpdate(decoded.sub, {$set: {password: hashed}}, function(err, result) {
            if (err) return reply(err);
            reply.view('recovery', {
              success: 'Password has been updated',
              logo_url: config.get('logo_url')
            })
          })
        });
      });
    },
    config: {
      id: 'password_recovery_proceed',
      validate: {
        payload: {
          token: Joi.string().required(),
          password: Joi.string().min(6).required(),
          password_confirm: Joi.string().min(6).required()
        },
        failAction: function(request, reply, source, error) {
          error.data.details.forEach(function(item) {
            request.session.flash('error', item.message);
          }.bind(this));
          reply.redirect(request.to('password_recovery', {query: {token: request.payload.token}}));
        }
      }
    }
  })
}
