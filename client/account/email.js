var React = require('react');
var request = require('superagent');
var config = require('../config')
var urljoin = require('url-join');

module.exports = React.createClass({
  getInitialState: function() {
    return {
      email: null,
      email_verified: false,
      editing: false,
      waiting: false,
      error: null
    }
  },

  componentDidMount: function() {
    this.fetchUser();
  },

  fetchUser: function() {
    request.get(urljoin(config.PREFIX, '/api/user'))
      .end(function(err, res) {
        this.setState(res.body);
      }.bind(this));
  },

  toggle: function() {
    this.setState({editing: !this.state.editing, error: null});
  },

  submit: function(ev) {
    ev.preventDefault();
    var email = React.findDOMNode(this.refs.email).value;
    request.post(urljoin(config.PREFIX, '/api/user/email'))
      .send({email: email})
      .end(function(err, res) {
        if (err) {
          this.setState({
            error: res.body.message
          });
        }
        else {
          this.setState({editing: false, error: null, waiting: true});
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

    var body = (
      <div>
        <p>
          <b>Address:</b> {this.state.email}<br />
          <b>Verification:</b> {verified}
        </p>
        <button className="btn btn-default" onClick={this.toggle}>Change address</button>
      </div>
    );

    if (this.state.editing) {
      body = (
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

    if (this.state.waiting) {
      body = (
        <div className="alert alert-info">
          <b>Confirmation needed</b><br />
          A validation email has been sent to your provided email address.
          Please check your email to validate changes.
        </div>
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
