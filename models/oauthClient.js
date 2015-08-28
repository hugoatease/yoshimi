var Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
var ObjectAssign = require('object-assign');
var BaseModel = require('hapi-mongo-models').BaseModel;
var Promise = require('bluebird');

var OAuthClient = BaseModel.extend({
  constructor: function(attrs) {
    ObjectAssign(this, attrs);
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
