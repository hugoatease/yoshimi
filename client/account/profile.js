var React = require('react');
var request = require('superagent');

module.exports = React.createClass({
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
