module.exports = function(server) {
  require('./signup')(server);
  require('./login')(server);
}
