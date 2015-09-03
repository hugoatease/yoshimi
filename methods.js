var jwt = require('jsonwebtoken');
var url = require('url');
var config = require('config');

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
  server.method('sendValidation', function (server, request, user_id, email) {
    return new Promise(function(resolve, reject) {
      var mail_token = createMailToken(server, user_id, email);
      var verification_url = request.to('email_verification', {query: {token: mail_token}});
      var Mailer = server.plugins.mailer;
      Mailer.sendMail({
        from: config.get('server_email'),
        to: email,
        subject: config.get('name') + ' - Email validation',
        html: {path: 'emails/validation.hbs'},
        context: {url: verification_url}
      }, function() {
        resolve();
      });
    });
  });
}
