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
			name: null,
			description: null,
			client_id: null,
			client_secret: null,
			redirect_uri: null,
			error: null,
		}
	},

	componentDidMount: function() {
		request.get(urljoin(config.PREFIX, '/api/apps/', this.props.params.id)).end(function(err, res) {
			var app = res.body;
			this.setState(app);
		}.bind(this));
	},

	updateDescription: function(ev) {
		ev.preventDefault();
		var description = React.findDOMNode(this.refs.description).value;
		request.put(urljoin(config.PREFIX, '/api/apps/', this.props.params.id)).send({
			description: description
		}).end(function(err, res) {
			var app = res.body;

			if (res.ok) {
				this.setState(app);
				this.setState({error: null});
			}
			else {
				this.setState({error: res.text});
			}
		}.bind(this));
	},

	updateRedirect: function(ev) {
		ev.preventDefault();
		request.put(urljoin(config.PREFIX, '/api/apps/', this.props.params.id)).send({
			redirect_uri: this.state.redirect_uri
		}).end(function(err, res) {
			var app = res.body;

			if (res.ok) {
				this.setState(app);
				this.setState({error: null});
			}
			else {
				this.setState({error: res.text});
			}
		}.bind(this));
	},

	uriChange: function(ev) {
		this.setState({redirect_uri: ev.target.value});
	},

	descriptionChange: function(ev) {
		this.setState({description: ev.target.value});
	},

	delete: function() {
		request.del(urljoin(config.PREFIX, '/api/apps/', this.props.params.id)).end(function() {
			this.transitionTo('apps');
		}.bind(this));
	},

	render: function() {
		if (this.state.error !== null) {
			var error = (
        <div className="alert alert-warning">
          <b>Error.</b> {this.state.error}
        </div>
			);
		}

		if (this.state.redirect_uri == null) {
			var redirect_incentive = (
        <div className="alert alert-warning">
          <b>Warning.</b> You must specify a redirect URI in order for auth code and token grant types to work.
        </div>
			);
		}

		return (
	    <div className="col-xs-12">
				<br />
	      <div className="panel panel-primary">
	        <div className="panel-body">
	          <h3 className="text-center">{this.state.name}</h3>
	          {error}
	          <p style={{'wordWrap': 'break-word'}}>
	          	<b>Client identifier</b><br />
	          	{this.state.client_id}
	          </p>

	          <p style={{'wordWrap': 'break-word'}}>
	          	<b>Client secret</b><br />
	          	{this.state.client_secret}
	          </p>

	          <form onSubmit={this.updateDescription}>
	          	<textarea className="form-control" placeholder="Description" rows="3" ref="description" value={this.state.description} onChange={this.descriptionChange}/>
	          	<br />
	          	<button type="submit" className="btn btn-default">Update description</button>
	          </form>
	          <br />

	          {redirect_incentive}

	          <form onSubmit={this.updateRedirect}>
	          	<input type="text" className="form-control" value={this.state.redirect_uri} onChange={this.uriChange} placeholder="Redirect URI" ref="redirect_uri" />
	          	<br />
	          	<button type="submit" className="btn btn-default">Update redirect</button>
	          </form>

	          <hr />
          	<button className="btn btn-danger" onClick={this.delete}>Delete app</button>
	        </div>
	      </div>
	    </div>
		);
	}
});
