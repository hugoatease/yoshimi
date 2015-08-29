var Hapi = require('hapi');
var Joi = require('joi');
var Boom = require('boom');
var bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');
var url = require('url');

function createMailToken(server, user_id, email) {
  return jwt.sign({
    email: email
  }, 'OsYAL0FLiEYeAC5OP05X21kqlWf9k9cT2TP4m3xgE9M=', {
    algorithm: 'HS256',
    subject: user_id,
    issuer: server.info.uri,
    audience: server.info.uri
  });
}

function sendValidation(server, request, user_id, email) {
  return new Promise(function(resolve, reject) {
    var mail_token = createMailToken(server, user_id, email);
    var verification_url = url.parse(server.info.uri);
    verification_url.pathname = '/email_verification';
    verification_url.query = {token: mail_token};
    var Mailer = request.server.plugins.mailer;
    Mailer.sendMail({
      from: 'noreply@musicpicker.net',
      to: email,
      subject: 'Yoshimi - Email validation',
      html: {path: 'emails/validation.hbs'},
      context: {url: url.format(verification_url)}
    }, function() {
      resolve();
    });
  });
}

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
      User.count({$or: [{username: request.payload.username}, {email: request.payload.email, email_verified: true}]}, function(err, count) {
        if (err || count > 0) {
          request.session.flash('error', "Username or email is already registered");
          return reply.redirect('/signup');
        }

        bcrypt.hash(request.payload.password, 10, function(err, hashed) {
          User.insertOne({
            username: request.payload.username,
            password: hashed,
            email: request.payload.email,
            email_verified: false
          }, function(err, results) {
            sendValidation(server, request, results[0]._id, results[0].email).then(function() {
              reply('Signup success');
            })
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

  server.route({
    method: 'GET',
    path: '/email_verification',
    handler: function(request, reply) {
      jwt.verify(request.query.token, 'OsYAL0FLiEYeAC5OP05X21kqlWf9k9cT2TP4m3xgE9M=', {
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
      validate: {
        query: {
          token: Joi.string().required()
        }
      }
    }
  })
}
