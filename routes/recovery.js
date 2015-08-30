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
        token: request.query.token
      });
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
          return reply.redirect('/password_recovery');
        }
        var token = jwt.sign({}, config.get('secret'), {
          algorithm: 'HS256',
          subject: user._id,
          issuer: server.info.uri,
          audience: server.info.uri,
          expiresInSeconds: config.get('expirations.account_recovery')
        });
        var Mailer = request.server.plugins.mailer;
        var verification_url = url.parse(server.info.uri);
        verification_url.pathname = '/password_recovery';
        verification_url.query = {token: token};
        Mailer.sendMail({
          from: 'noreply@musicpicker.net',
          to: user.email,
          subject: config.get('name') + ' - Password recovery',
          html: {path: 'emails/recovery.hbs'},
          context: {url: url.format(verification_url)}
        }, function() {
          reply.view('recovery', {
            success: 'Recovery email has been sent.'
          })
        });
      });
    },
    config: {
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
        return reply.redirect('/password_recovery?token=' + request.payload.token);
      }

      jwt.verify(request.payload.token, config.get('secret'), {
        issuer: server.info.uri,
        audience: server.info.uri,
      }, function(err, decoded) {
        if (err) return reply(err);
        var User = request.server.plugins['hapi-mongo-models'].User;

        bcrypt.hash(request.payload.password, 10, function(err, hashed) {
          User.findByIdAndUpdate(decoded.sub, {$set: {password: hashed}}, function(err, result) {
            if (err) return reply(err);
            reply.view('recovery', {
              success: 'Password has been updated'
            })
          })
        });
      });
    },
    config: {
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
          reply.redirect('/password_recovery?token=' + request.payload.token);
        }
      }
    }
  })
}
