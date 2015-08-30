var React = require('react');
var request = require('superagent');

module.exports = React.createClass({
  getInitialState: function() {
    return {
      error: null,
      success: null
    }
  },

  submit: function(ev) {
    ev.preventDefault();
    request.post('/api/user/password')
      .send({
        current_password: React.findDOMNode(this.refs.current_password).value,
        password: React.findDOMNode(this.refs.password).value,
        password_confirm: React.findDOMNode(this.refs.password_confirm).value
      })
      .end(function(err, res) {
        if (err) {
          this.setState({error: res.body.message, success: null});
        }
        else {
          this.setState({success: res.text, error: null});
        }
      }.bind(this));
  },

  render: function() {
    var error = null, success = null;
    if (this.state.error) {
      var error = (
        <div className="alert alert-warning"><b>Error. </b>{this.state.error}</div>
      )
    }

    if (this.state.success) {
      var success = (
        <div className="alert alert-success"><b>Success. </b>{this.state.success}</div>
      )
    }

    return (
      <div className="panel panel-default">
        <div className="panel-heading">Password change</div>
        <div className="panel-body">
          {error}
          {success}
          <form onSubmit={this.submit}>
            <div className="form-group">
              <label htmlFor="current_password">Current password</label>
              <input className="form-control" type="password" id="current_password" ref="current_password" placeholder="Current password" />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input className="form-control" type="password" id="password" ref="password" placeholder="Password" />
            </div>
            <div className="form-group">
              <label htmlFor="password_confirm">Password confirmation</label>
              <input className="form-control" type="password" id="password_confirm" ref="password_confirm" placeholder="Password confirmation" />
            </div>
            <div className="form-group">
              <button type="submit" className="btn btn-default">Change password</button>
            </div>
          </form>
        </div>
      </div>
    );
  }
});
