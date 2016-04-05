var Joi = require('joi');
var bcrypt = require('bcrypt');
var config = require('config');
var url = require('url');
var superagent = require('superagent');

var acceptLanguage = require('accept-language');
acceptLanguage.languages(['en', 'fr']);

module.exports = function(server) {
  server.route({
    method: 'GET',
    path: '/login',
    handler: function(request, reply) {
      var OAuthClient = request.server.plugins['hapi-mongo-models'].OAuthClient;
      if (request.query.next) {
        request.session.set('login_redirect', request.query.next);
      }
      if (request.session.get('signup_redirect') === 'true') {
        request.session.clear('signup_redirect');
        return reply.redirect(request.to('signup'));
      }
      if (request.session.get('oauth_client')) {
        if (!config.get('use_etcd')) {
          OAuthClient.findOne({client_id: request.session.get('oauth_client')}, function(err, client) {
            if (err) return;
            reply.view('login', {
              errors: request.session.flash('error'),
              signup_link: request.to('signup'),
              recovery_link: request.to('recovery'),
              logo_url: config.get('logo_url'),
              lang: acceptLanguage.get(request.headers['accept-language']),
              client_name: client.name,
              facebook_link: request.to('facebook')
            });
          });
        }
        else {
          server.methods.etcdClient(request.session.get('oauth_client')).then(function(client) {
            if (client == null) {
              reply('Client does not exist').code(404);
            }
            else {
              reply.view('login', {
                errors: request.session.flash('error'),
                signup_link: request.to('signup'),
                recovery_link: request.to('recovery'),
                logo_url: config.get('logo_url'),
                lang: acceptLanguage.get(request.headers['accept-language']),
                client_name: client.name,
                facebook_link: request.to('facebook')
              });
            }
          });
        }
      }
      else {
        reply.view('login', {
          errors: request.session.flash('error'),
          signup_link: request.to('signup'),
          recovery_link: request.to('recovery'),
          logo_url: config.get('logo_url'),
          lang: acceptLanguage.get(request.headers['accept-language']),
          facebook_link: request.to('facebook')
        });
      }
      request.session.clear('oauth_client');
    }
  })

  server.route({
    method: 'POST',
    path: '/login',
    handler: function(request, reply) {
      var User = request.server.plugins['hapi-mongo-models'].User;
      User.findOne({'$or': [{username: request.payload.username}, {email: request.payload.username}]}, function(err, result) {
        if (err || !result) {
          request.session.flash('error', 'Username does not exist');
          return reply.redirect(request.to('login'));
        }

        if (!result.password) {
          request.session.flash('error', 'Username has no associated password');
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
  });

  server.route({
    method: 'GET',
    path: '/facebook_login',
    handler: function(request, reply) {
      var oauth_url = url.parse('https://www.facebook.com/dialog/oauth');
      oauth_url.query = {
        client_id: config.get('facebook_app_id'),
        redirect_uri: config.get('facebook_redirect_uri'),
        response_type: 'code',
        scope: 'public_profile,email'
      };
      return reply.redirect(url.format(oauth_url));
    },
    config: {
      id: 'facebook'
    }
  });

  server.route({
    method: 'GET',
    path: '/facebook_redirect',
    handler: function(request, reply) {
      var User = request.server.plugins['hapi-mongo-models'].User;
      superagent.post('https://graph.facebook.com/v2.3/oauth/access_token')
        .query({
          code: request.query.code,
          redirect_uri: config.get('facebook_redirect_uri'),
          client_secret: config.get('facebook_app_secret'),
          client_id: config.get('facebook_app_id')
        })
        .end(function(err, res) {
          var login_redirect = request.session.get('login_redirect');
          var bearer = res.body.access_token;
          superagent.get('https://graph.facebook.com/v2.3/me')
            .query({
              fields: 'id,name,email,first_name,last_name,verified',
              access_token: res.body.access_token
            })
            .accept('application/json')
            .end(function(err, res) {
              User.findOne({facebook_id: res.body.id}, function(err, result) {
                if (err || !result) {
                  User.insertOne({
                    facebook_id: res.body.id,
                    given_name: res.body.first_name,
                    family_name: res.body.last_name,
                    email: res.body.email,
                    email_verified: res.body.verified,
                    facebook_token: bearer
                  }, function(err, results) {
                    request.auth.session.set(results[0]._id);
                    if (login_redirect) {
                      request.session.clear('login_redirect');
                      reply.redirect(login_redirect);
                    }
                    else {
                      reply.redirect(request.to('index'));
                    }
                  });
                }
                else {
                  User.findByIdAndUpdate(result._id, {$set: {facebook_token: bearer}}, function() {
                    request.auth.session.set(result._id);
                    if (login_redirect) {
                      request.session.clear('login_redirect');
                      reply.redirect(login_redirect);
                    }
                    else {
                      reply.redirect(request.to('index'));
                    }
                  });
                }
              })
            }.bind(this));
        }.bind(this));
    }
  });

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
