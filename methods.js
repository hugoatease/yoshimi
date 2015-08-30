var jwt = require('jsonwebtoken');
var url = require('url');
var config = require('config');

function createMailToken(server, user_id, email) {
  return jwt.sign({
    email: email
  }, config.get('secret'), {
    algorithm: 'HS256',
    subject: user_id,
    issuer: server.info.uri,
    audience: server.info.uri
  });
}

module.exports = function(server) {
  server.method('sendValidation', function (server, request, user_id, email) {
    return new Promise(function(resolve, reject) {
      var mail_token = createMailToken(server, user_id, email);
      var verification_url = url.parse(server.info.uri);
      verification_url.pathname = '/email_verification';
      verification_url.query = {token: mail_token};
      var Mailer = server.plugins.mailer;
      Mailer.sendMail({
        from: 'noreply@musicpicker.net',
        to: email,
        subject: config.get('name') + ' - Email validation',
        html: {path: 'emails/validation.hbs'},
        context: {url: url.format(verification_url)}
      }, function() {
        resolve();
      });
    });
  });
}
