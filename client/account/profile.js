var React = require('react');
var request = require('superagent');
var config = require('../config')
var urljoin = require('url-join');

module.exports = React.createClass({
  getInitialState: function() {
    return {
      username: null,
      admin: null,
      given_name: null,
      family_name: null,
      birthdate: null,
      phone_number: null,
      editing: false,
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

  submit: function() {
    request.put(urljoin(config.PREFIX, '/api/user'))
      .send({
        given_name: React.findDOMNode(this.refs.given_name).value,
        family_name: React.findDOMNode(this.refs.family_name).value
      })
      .end(function(err, res) {
        if (err) {
          this.setState({error: res.body.message});
        }
        else {
          this.setState({error: null});
          this.setState(res.body);
          this.toggle();
        }
      }.bind(this));
  },

  render: function() {
    var username = null;
    var admin = null, given_name = null, family_name = null;
    if (this.state.username) {
      username = <span><b>Username:</b> {this.state.username}<br /></span>
    }
    if (this.state.admin) {
      var admin = <span><span className="label label-danger">Administrator</span><br /></span>
    }
    if (this.state.given_name) {
      var given_name = <span><span><b>Given name:</b> {this.state.given_name}</span><br /></span>
    }
    if (this.state.family_name) {
      var family_name = <span><b>Family name:</b> {this.state.family_name}</span>;
    }

    if (!this.state.editing) {
      var body = (
        <div>
          <p>
            {username}
            {admin}
            {given_name}
            {family_name}
          </p>
          <button className="btn btn-default" onClick={this.toggle}>Edit</button>
        </div>
      )
    }
    else {
      var body = (
        <form onSubmit={this.submit}>
          <div className="form-group">
            <label htmlFor="given_name">Given name</label>
            <input type="text" id="given_name" ref="given_name" className="form-control" placeholder="Given name" />
          </div>
          <div className="form-group">
            <label htmlFor="family_name">Family name</label>
            <input type="text" id="family_name" ref="family_name" className="form-control" placeholder="Family name" />
          </div>
          <div className="form-group">
            <button type="submit" className="btn btn-primary">Edit</button>
            &nbsp;&nbsp;&nbsp;
            <button className="btn btn-default" onClick={this.toggle}>Cancel</button>
          </div>
        </form>
      )
    }

    var error = null;
    if (this.state.error) {
      error = (
        <div className="alert alert-warning"><b>Error. </b>{this.state.error}</div>
      )
    }

    return (
      <div className="panel panel-default">
        <div className="panel-heading">Profile information</div>
        <div className="panel-body">
          {error}
          {body}
        </div>
      </div>
    )
  }
});
