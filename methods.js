var jwt = require('jsonwebtoken');
var url = require('url');
var config = require('config');
var polyglot = require('./polyglot');

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
}
