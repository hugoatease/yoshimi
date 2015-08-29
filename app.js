var Hapi = require('hapi');
var Promise = require('bluebird');

var server = new Hapi.Server();
server.connection({port: 3000});

server.register({
  register: require('yar'),
  options: {
    name: 'yoshimi',
    cookieOptions: {
      password: 'OsYAL0FLiEYeAC5OP05X21kqlWf9k9cT2TP4m3xgE9M=',
      isSecure: false
    }
  }
}, function(err) {
  if (!err) return;
  console.log(err);
});

server.register(require('hapi-auth-cookie'), function(err) {
  server.auth.strategy('session', 'cookie', {
    cookie: 'yoshimi-auth',
    password: 'OsYAL0FLiEYeAC5OP05X21kqlWf9k9cT2TP4m3xgE9M=',
    isSecure: false,
    redirectTo: '/login',
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
  var redis = require('then-redis').createClient();
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
    mongodb: {
      url: 'mongodb://localhost:27017/yoshimi'
    },
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

server.register(require('vision'), function(err) {
  server.views({
    engines: {hbs: require('handlebars')},
    relativeTo: __dirname,
    path: 'views',
    layout: true,
    isCached: false
  })
});

require('./routes')(server);

server.start(function() {
  console.log('Server running at: ', server.info.uri);
});
