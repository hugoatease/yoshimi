var Joi = require('joi');
var ObjectAssign = require('object-assign');
var BaseModel = require('hapi-mongo-models').BaseModel;

var User = BaseModel.extend({
  constructor: function(attrs) {
    ObjectAssign(this, attrs);
  },
});

User._collection = 'users';
User.schema = Joi.object().keys({
  username: Joi.string().required(),
  password: Joi.string().required(),
  email: Joi.string().email().required(),
  admin: Joi.boolean().default(false),
  email_verified: Joi.boolean().default(false)
});

module.exports = User;
