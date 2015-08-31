var Joi = require('joi');
var bcrypt = require('bcrypt');

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
          if (request.session.get('login_redirect')) {
            reply.redirect(request.session.get('login_redirect'));
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
