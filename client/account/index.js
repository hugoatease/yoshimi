var React = require('react');
var request = require('superagent');

var Profile = require('./profile');
var Email = require('./email');
var Password = require('./password');

module.exports = React.createClass({
  render: function() {
    return (
      <div>
        <h3>Account</h3><hr />
        <div className="row">
          <div className="col-md-6">
            <Profile />
            <Email />
          </div>
          <div className="col-md-6">
            <Password />
          </div>
        </div>
      </div>
    );
  }
});
