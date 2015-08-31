var Hapi = require('hapi');
var Promise = require('bluebird');
var config = require('config');

var server = new Hapi.Server();
server.connection({port: 3000});

server.register({
  register: require('yar'),
  options: {
    name: 'yoshimi',
    cookieOptions: {
      password: config.get('secret'),
      isSecure: config.get('secure')
    }
  }
}, function(err) {
  if (!err) return;
  console.log(err);
});

server.register(require('hapi-auth-cookie'), function(err) {
  var urljoin = require('url-join');
  server.auth.strategy('session', 'cookie', {
    cookie: 'yoshimi-auth',
    password: config.get('secret'),
    isSecure: false,
    redirectTo: urljoin(config.get('prefix'), 'login'),
    appendNext: true
  })
});

server.register(require('hapi-auth-basic'), function(err) {
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
  })
});

server.register(require('hapi-auth-bearer-token'), function(err) {
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
  })
});

server.register({
  register: require('hapi-mongo-models'),
  options: {
    mongodb: config.get('mongodb'),
    autoIndex: true,
    models: {
      User: './models/user',
      OAuthClient: './models/oauthClient'
    }
  }

}, function(err) {
  if (!err) return;
  console.log(err);
});

server.register(require('inert'), function(err) {
  server.route({
    method: 'GET',
    path: '/static/{param*}',
    handler: {
      directory: {
        path: 'static/'
      }
    }
  })
});

var viewsOptions = {
  engines: {hbs: require('handlebars')},
  relativeTo: __dirname,
  path: 'views',
  layout: true
}

server.register(require('vision'), function(err) {
  server.views(viewsOptions);
});

var transportOptions = config.has('mail.options') ? config.get('mail.options') : {};
server.register({
  register: require('hapi-mailer'),
  options: {
    views: viewsOptions,
    transport: require(config.get('mail.transport'))(transportOptions)
  }
}, function(err) {
  if (!err) return;
  console.log(err);
})

server.register(require('hapi-to'), function(err) {
  if (!err) return;
  console.log(err);
});

var routeOptions = {};
if (config.get('prefix') !== '/') {
  routeOptions.routes = {
    prefix: config.get('prefix')
  }
}

server.register(require('./routes'), routeOptions, function(err) {
  require('./methods')(server);
  server.start(function() {
    console.log('Server running at: ', server.info.uri);
  });
});
