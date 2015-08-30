var React = require('react');
var request = require('superagent');
var Navigation = require('react-router').Navigation;
var Link = require('react-router').Link;

module.exports = React.createClass({
	mixins: [Navigation],

	create: function(ev) {
		ev.preventDefault();
		name = React.findDOMNode(this.refs.name).value;

		request.post('/api/apps').send({
			name: name
		}).end(function() {
			this.transitionTo('apps');
		}.bind(this));
	},

	render: function() {
		return (
      <div className="col-md-6 col-md-offset-3">
				<br />
        <div className="panel panel-primary">
          <div className="panel-body">
            <h3 className="text-center">Create app</h3><br />
            <form onSubmit={this.create}>
            	<div className="form-group">
            		<input type="text" className="form-control" ref="name" placeholder="Application name" />
            	</div>
            	<div className="text-center">
								<button type="submit" className="btn btn-success">Create</button>
            	</div>
            </form>
          </div>
        </div>
      </div>
		);
	}
});
