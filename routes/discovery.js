var config = require('config');
var rsaPemToJwk = require('rsa-pem-to-jwk');

module.exports = function(server) {
  server.route({
    method: 'GET',
    path: '/.well-known/openid-configuration',
    handler: function(request, reply) {
      var configuration = {
        issuer: config.get('issuer_url'),
        authorization_endpoint: request.to('authorization'),
        token_endpoint: request.to('token'),
        userinfo_endpoint: request.to('userinfo'),
        jwks_uri: request.to('jwks'),
        response_types_supported: ['code', 'id_token', 'token id_token'],
        grant_types_supported: ['authorization_code', 'implicit'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256']
      }

      return reply(configuration);
    }
  });

  server.route({
    method: 'GET',
    path: '/oauth/jwks',
    handler: function(request, reply) {
      var jwks = {
        keys: [
          rsaPemToJwk(config.get('key'), {}, 'public')
        ]
      }
      return reply(jwks);
    },
    config: {
      id: 'jwks'
    }
  });
}
