var Hapi = require('hapi');
var Promise = require('bluebird');
var config = require('config');

var server = new Hapi.Server();
server.connection({port: config.get('port')});

var transportOptions = config.has('mail.options') ? config.get('mail.options') : {};
var routeOptions = {};
if (config.get('prefix') !== '/') {
  routeOptions.routes = {
    prefix: config.get('prefix')
  }
}

var viewsOptions = {
  engines: {hbs: require('handlebars')},
  relativeTo: __dirname,
  path: 'views',
  layout: true
}

server.register([
  {
    register: require('yar'),
    options: {
      name: 'yoshimi',
      cookieOptions: {
        password: config.get('secret'),
        isSecure: config.get('secure')
      }
    }
  },
  require('hapi-auth-cookie'),
  require('hapi-auth-basic'),
  require('hapi-auth-bearer-token'),
  {
    register: require('hapi-mongo-models'),
    options: {
      mongodb: config.get('mongodb'),
      autoIndex: true,
      models: {
        User: './models/user',
        OAuthClient: './models/oauthClient'
      }
    }
  },
  require('inert'),
  require('vision'),
  {
    register: require('hapi-mailer'),
    options: {
      views: viewsOptions,
      transport: require(config.get('mail.transport'))(transportOptions)
    }
  },
  require('hapi-to')
], function(err) {
  if (err) return console.log(err);

  var urljoin = require('url-join');
  server.auth.strategy('session', 'cookie', {
    cookie: 'yoshimi-auth',
    password: config.get('secret'),
    isSecure: false,
    redirectTo: urljoin(config.get('prefix'), 'login'),
    appendNext: true
  });

  server.auth.strategy('basic', 'basic', {
    validateFunc: function(request, username, password, callback) {
      var OAuthClient = request.server.plugins['hapi-mongo-models'].OAuthClient;
      OAuthClient.findOne({client_id: username, client_secret: password}, function(err, client) {
        if (err) return callback(err);
        if (!client) {
          callback(null, false);
        }
        else {
          callback(null, true, {client_id: username, client_secret: password});
        }
      });
    }
  });

  var redis = require('then-redis').createClient(config.get('redis'));
  server.auth.strategy('bearer', 'bearer-access-token', {
    validateFunc: function(token, callback) {
      Promise.props({
        client: redis.get('yoshimi.oauth.token.' + token + '.client'),
        user: redis.get('yoshimi.oauth.token.' + token + '.user'),
        scope: redis.get('yoshimi.oauth.token.' + token + '.scope')
      }).then(function(props) {
        if (!props.client) {
          callback(null, false);
        }
        else {
          callback(null, true, {client_id: props.client_id, user_id: props.user, scope: props.scope});
        }
      }).catch(function(err) {
        callback(err);
      });
    }
  });

  server.route({
    method: 'GET',
    path: '/static/{param*}',
    handler: {
      directory: {
        path: 'static/'
      }
    }
  });

  server.views(viewsOptions);

  server.register(require('./routes'), routeOptions, function(err) {
    require('./methods')(server);
    server.start(function() {
      console.log('Server running at: ', server.info.uri);
    });
  });
});
