var React = require('react');
var RouteHandler = require('react-router').RouteHandler;
var Link = require('react-router').Link;
var State = require('react-router').State;

module.exports = React.createClass({
  mixins: [State],
  render: function() {
    var accountClass = this.isActive('account') ? 'active' : null;
    var account = <li className={accountClass}><Link to="account">Account</Link></li>;

    var appsClass = (this.isActive('apps') || this.isActive('app-create') || this.isActive('app-detail')) ? 'active' : null;
    var apps = <li className={appsClass}><Link to="apps">Apps</Link></li>;

    return (
      <div className="row">
        <div className="col-md-3">
          <h3>/* @echo APPNAME */</h3><hr />
          <ul className="nav nav-pills nav-stacked">
            {account}
            {apps}
          </ul>
        </div>
        <div className="col-md-9">
          <RouteHandler />
        </div>
      </div>
    );
  }
});
