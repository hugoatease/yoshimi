var jwt = require('jsonwebtoken');
var url = require('url');
var config = require('config');
var polyglot = require('./polyglot');
var Etcd = require('node-etcd');
var keyBy = require('lodash.keyby');

if (config.get('use_etcd')) {
  etcd = new Etcd('127.0.0.1', '2379');
}

function createMailToken(server, user_id, email) {
  return jwt.sign({
    email: email
  }, config.get('secret'), {
    algorithm: 'HS256',
    subject: user_id,
    issuer: config.get('issuer_url'),
    audience: config.get('issuer_url')
  });
}

module.exports = function(server) {
  server.method('sendValidation', function (server, request, user_id, email, locale) {
    return new Promise(function(resolve, reject) {
      var mail_token = createMailToken(server, user_id, email);
      var verification_url = request.to('email_verification', {query: {token: mail_token}});
      var Mailer = server.plugins.mailer;
      if (!locale) {
        locale = 'en';
      }
      var template = 'emails/validation_' + locale + '.hbs';
      Mailer.sendMail({
        from: config.get('server_email'),
        to: email,
        subject: config.get('name') + ' - ' + polyglot(locale).t('emailValidation'),
        html: {path: template},
        context: {
          url: verification_url,
          brand_name: config.get('name')
        }
      }, function() {
        resolve();
      });
    });
  });

  server.method('etcdClient', function(client_id) {
    var OAuthClient = server.plugins['hapi-mongo-models'].OAuthClient;
    return new Promise(function(resolve, reject) {
      etcd.get('/yoshimi/clients/' + client_id, {recursive: true}, function(err, data) {
        if (err) {
          OAuthClient.findOne({client_id: client_id}, function(err, client) {
            if (err) {
              return resolve(null);
            }
            return resolve(client);
          });
        }
        else {
          var keys = keyBy(data.node.nodes, 'key');
          return resolve({
            name: keys['/yoshimi/clients/' + client_id + '/name'].value,
            client_secret: keys['/yoshimi/clients/' + client_id + '/client_secret'].value,
            redirect_uri: keys['/yoshimi/clients/' + client_id + '/redirect_uri'].value
          });
        }
      });
    });
  });
}
