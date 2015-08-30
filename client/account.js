var React = require('react');
var request = require('superagent');

var Profile = React.createClass({
  getInitialState: function() {
    return {
      username: null,
      admin: null,
      given_name: null,
      family_name: null,
      birthdate: null,
      phone_number: null
    }
  },

  componentDidMount: function() {
    request.get('/api/user')
      .end(function(err, res) {
        this.setState(res.body);
      }.bind(this));
  },

  render: function() {
    var admin = null, given_name = null, family_name = null;
    if (this.state.admin) {
      var admin = <span className="label label-danger">Administrator</span>
    }
    if (this.state.given_name) {
      var last_name = <span><b>Last name:</b> {this.state.given_name}</span>
    }
    if (this.state.family_name) {
      var first_name = <span><b>First name:</b> {this.state.family_name}</span>;
    }
    return (
      <div className="panel panel-default">
        <div className="panel-heading">Profile information</div>
        <div className="panel-body">
          <form>
            <b>Username:</b> {this.state.username}<br />
            {admin}<br />
            {given_name}<br />
            {family_name}
          </form>
        </div>
      </div>
    )
  }
});

var Email = React.createClass({
  getInitialState: function() {
    return {
      email: null,
      email_verified: false,
      editing: false
    }
  },

  componentDidMount: function() {
    request.get('/api/user')
      .end(function(err, res) {
        this.setState(res.body);
      }.bind(this));
  },

  render: function() {
    if (!this.state.email_verified) {
      var verified = <span className="label label-danger">Not verified</span>
    }
    else {
      var verified = <span className="label label-success">Verified</span>
    }
    return (
      <div className="panel panel-default">
        <div className="panel-heading">Email address</div>
        <div className="panel-body">
          <b>Address:</b> {this.state.email}<br />
          <b>Verification:</b> {verified}
        </div>
      </div>
    );
  }
});

module.exports = React.createClass({
  render: function() {
    return (
      <div>
        <div className="row">
          <h3>Account</h3><hr />
        </div>
        <div className="row">
          <div className="col-md-6">
            <Profile />
          </div>
          <div className="col-md-6">
            <Email />
          </div>
        </div>
      </div>
    );
  }
});
