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
      var admin = <span><span className="label label-danger">Administrator</span><br /></span>
    }
    if (this.state.given_name) {
      var last_name = <span><span><b>Last name:</b> {this.state.given_name}</span><br /></span>
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
            {admin}
            {given_name}
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
      editing: false,
      error: null
    }
  },

  componentDidMount: function() {
    this.fetchUser();
  },

  fetchUser: function() {
    request.get('/api/user')
      .end(function(err, res) {
        this.setState(res.body);
      }.bind(this));
  },

  toggle: function() {
    this.setState({editing: !this.state.editing});
  },

  submit: function(ev) {
    ev.preventDefault();
    var email = React.findDOMNode(this.refs.email).value;
    request.post('/api/user/email')
      .send({email: email})
      .end(function(err, res) {
        if (err) {
          this.setState({
            error: res.body.message
          });
        }
        else {
          this.setState({editing: false});
          this.fetchUser();
        }
      }.bind(this));
  },

  render: function() {
    if (!this.state.email_verified) {
      var verified = <span className="label label-danger">Not verified</span>
      var validation_link = <span><a href="#">Resend validation link</a><br /></span>;
    }
    else {
      var verified = <span className="label label-success">Verified</span>
      var validation_link = null;
    }

    if (!this.state.editing) {
      var body = (
        <div>
          <p>
            <b>Address:</b> {this.state.email}<br />
            <b>Verification:</b> {verified}
          </p>
          <button className="btn btn-default" onClick={this.toggle}>Change address</button>
        </div>
      );
    }

    else {
      var body = (
        <form onSubmit={this.submit}>
          <div className="form-group">
            <label htmlFor="email">New email address</label>
            <input className="form-control" type="email" id="email" ref="email" placeholder="New email address" />
          </div>
          <div className="form-group">
            <button type="submit" className="btn btn-primary">Change email</button>
            &nbsp;&nbsp;&nbsp;
            <button className="btn btn-default" onClick={this.toggle}>Cancel</button>
          </div>
        </form>
      );
    }

    var error = null;
    if (this.state.error) {
      error = (
        <div className="alert alert-warning"><b>Error. </b>{this.state.error}</div>
      )
    }

    return (
      <div className="panel panel-default">
        <div className="panel-heading">Email address</div>
        <div className="panel-body">
          {error}
          {body}
        </div>
      </div>
    );
  }
});

module.exports = React.createClass({
  render: function() {
    return (
      <div>
        <h3>Account</h3><hr />
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
