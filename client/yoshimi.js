var React = require('react');
var Router = require('react-router');
var Route = Router.Route;
var DefaultRoute = Router.DefaultRoute;

var App = require('./app');
var Account = require('./account');

var routes = (
  <Route handler={App}>
    <DefaultRoute name="account" handler={Account} />
  </Route>
);

module.exports = function(container) {
  Router.run(routes, Router.HashLocation, function(Root) {
    React.render(<Root />, container);
  })
}
