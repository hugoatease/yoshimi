var Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
var ObjectAssign = require('object-assign');
var BaseModel = require('hapi-mongo-models').BaseModel;
var Promise = require('bluebird');

var OAuthClient = BaseModel.extend({
  constructor: function(attrs) {
    ObjectAssign(this, attrs);
  },

  checkClient: function(client_id, redirect_uri) {
    return new Promise(function(resolve, reject) {
      this.findOne({client_id: this.ObjectId(client_id), redirect_uri: redirect_uri}, function(err, result) {
        if (err) return reject(err);
        if (!result) {
          reject(new Error('Client not found'));
        }
        else {
          resolve(result);
        }
      })
    }.bind(this));
  }
});

OAuthClient._collection = 'oauth_clients';
OAuthClient.schema = Joi.object().keys({
  client_id: Joi.string().required().min(42),
  client_secret: Joi.string().required().min(42),
  owner: Joi.objectId.required(),
  name: Joi.string().required(),
  description: Joi.string(),
  redirect_uri: Joi.string(),
  enable_grant_token: Joi.boolean().default(false)
});

module.exports = OAuthClient;
