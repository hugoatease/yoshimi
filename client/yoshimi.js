var React = require('react');
var Router = require('react-router');
var Route = Router.Route;
var DefaultRoute = Router.DefaultRoute;

var App = require('./app');
var Account = require('./account');

var Apps = require('./apps/list');
var AppCreate = require('./apps/create');
var AppDetail = require('./apps/detail');

var routes = (
  <Route handler={App}>
    <DefaultRoute name="account" handler={Account} />
    <Route name="apps" path="apps" handler={Apps}/>
    <Route name="app-create" path="apps/create" handler={AppCreate}/>
    <Route name="app-detail" path="apps/:id" handler={AppDetail}/>
  </Route>
);

module.exports = function(container) {
  Router.run(routes, Router.HashLocation, function(Root) {
    React.render(<Root />, container);
  })
}
