var Joi = require('joi');
Joi.phone = require('joi-phone');
var ObjectAssign = require('object-assign');
var BaseModel = require('hapi-mongo-models').BaseModel;

var User = BaseModel.extend({
  constructor: function(attrs) {
    ObjectAssign(this, attrs);
  },
});

User._collection = 'users';
User.schema = Joi.object().keys({
  username: Joi.string(),
  facebook_id: Joi.string(),
  facebook_token: Joi.string(),
  password: Joi.string(),
  email: Joi.string().email().required(),
  admin: Joi.boolean().default(false),
  email_verified: Joi.boolean().default(false),
  given_name: Joi.string(),
  family_name: Joi.string(),
  birthdate: Joi.date().iso(),
  phone_number: Joi.phone.e164()
});

module.exports = User;
