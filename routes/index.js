module.exports.register = function(server, options, next) {
  require('./signup')(server);
  require('./login')(server);
  require('./apps')(server);
  require('./oauth')(server);
  require('./recovery')(server);
  require('./user')(server);

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
  })

  next();
}

module.exports.register.attributes = {
  name: 'routes'
}
