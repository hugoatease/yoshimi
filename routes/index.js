module.exports.register = function(server, options, next) {
  require('./signup')(server);
  require('./login')(server);
  require('./apps')(server);
  require('./oauth')(server);
  require('./recovery')(server);
  require('./user')(server);
  require('./discovery')(server);

  server.route({
    method: 'GET',
    path: '/',
    handler: function(request, reply) {
      reply.view('app');
    },
    config: {
      id: 'index',
      auth: 'session'
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

  next();
}

module.exports.register.attributes = {
  name: 'routes'
}
