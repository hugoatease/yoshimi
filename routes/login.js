var Joi = require('joi');
var bcrypt = require('bcrypt');
var config = require('config');

var acceptLanguage = require('accept-language');
acceptLanguage.languages(['en', 'fr']);

module.exports = function(server) {
  server.route({
    method: 'GET',
    path: '/login',
    handler: function(request, reply) {
      if (request.query.next) {
        request.session.set('login_redirect', request.query.next);
      }
      reply.view('login', {
        errors: request.session.flash('error'),
        signup_link: request.to('signup'),
        recovery_link: request.to('recovery'),
        logo_url: config.get('logo_url'),
        lang: acceptLanguage.get(request.headers['accept-language'])
      });
    }
  })

  server.route({
    method: 'POST',
    path: '/login',
    handler: function(request, reply) {
      var User = request.server.plugins['hapi-mongo-models'].User;
      User.findOne({username: request.payload.username}, function(err, result) {
        if (err || !result) {
          request.session.flash('error', 'Username does not exist');
          return reply.redirect(request.to('login'));
        }

        bcrypt.compare(request.payload.password, result.password, function(err, match) {
          if (err || !match) {
            request.session.flash('error', 'Incorrect password for ' + result.username);
            return reply.redirect(request.to('login'));
          }

          request.auth.session.set(result._id);

          var login_redirect = request.session.get('login_redirect');
          if (login_redirect) {
            request.session.clear('login_redirect');
            reply.redirect(login_redirect);
          }
          else {
            reply.redirect(request.to('index'));
          }
        })
      })
    },
    config: {
      id: 'login',
      auth: {
        mode: 'try',
        strategy: 'session'
      },
      plugins: {
        'hapi-auth-cookie': {
          redirectTo: false
        }
      }
    }
  })

  server.route({
    method: 'GET',
    path: '/logout',
    handler: function(request, reply) {
      request.auth.session.clear();
      reply.redirect(request.to('index'));
    },
    config: {
      auth: 'session'
    }
  });
}
