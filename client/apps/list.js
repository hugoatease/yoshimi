var React = require('react');
var request = require('superagent');
var Navigation = require('react-router').Navigation;
var Link = require('react-router').Link;
var config = require('../config');
var urljoin = require('url-join');

module.exports = React.createClass({
	mixins: [Navigation],

	getInitialState: function() {
		return {
			apps: []
		}
	},

	componentDidMount: function() {
		request.get(urljoin(config.PREFIX, '/api/apps')).end(function(err, res) {
			var apps = res.body;
			this.setState({apps: apps});
		}.bind(this));
	},

	render: function() {
		return (
      <div className="col-md-6 col-md-offset-3">
				<br />
        <div className="panel panel-primary">
          <div className="panel-body">
            <h3 className="text-center">OAuth apps</h3><br />
            <div className="list-group">
            	{this.state.apps.map(function(app) {
            		return <Link to="app-detail" params={{id: app._id}} className="list-group-item">{app.name}</Link>;
            	}.bind(this))}
            </div>
            <div className="text-center">
            	<Link to="app-create" className="btn btn-default">Create app</Link>
            </div>
          </div>
        </div>
      </div>
	  );
	}
});
