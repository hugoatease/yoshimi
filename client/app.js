var React = require('react');
var RouteHandler = require('react-router').RouteHandler;
var Link = require('react-router').Link;
var State = require('react-router').State;
var config = require('./config');
var urljoin = require('url-join');

module.exports = React.createClass({
  mixins: [State],
  render: function() {
    var accountClass = this.isActive('account') ? 'active' : null;
    var account = <li className={accountClass}><Link to="account">Account</Link></li>;

    var appsClass = (this.isActive('apps') || this.isActive('app-create') || this.isActive('app-detail')) ? 'active' : null;
    var apps = <li className={appsClass}><Link to="apps">Apps</Link></li>;

    var logoutLink = urljoin(config.PREFIX, 'logout');

    if (config.LOGO_URL === 'null') {
      var branding = <div><h3>{config.NAME}</h3><hr /></div>;
    }
    else {
      var branding = <div id="logo" className="text-center"><img src={config.LOGO_URL} height="100" /></div>
    }

    return (
      <div className="row">
        <div className="col-md-3">
          {branding}
          <ul className="nav nav-pills nav-stacked">
            {account}
            {apps}
          </ul>
          <div className="text-center">
            <br />
            <a href={logoutLink} className="btn btn-danger">Log out</a>
          </div>
        </div>
        <div className="col-md-9">
          <RouteHandler />
        </div>
      </div>
    );
  }
});
