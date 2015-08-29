module.exports = function(server) {
  require('./signup')(server);
  require('./login')(server);
  require('./apps')(server);
  require('./oauth')(server);
  require('./recovery')(server);
}
