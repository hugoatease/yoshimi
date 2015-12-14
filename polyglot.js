var Polyglot = require('node-polyglot');

var phrases_en = {
  login: 'Log In',
  signup: 'Sign up',
  username: 'Username',
  password: 'Password',
  passwordConfirm: 'Password confirmation',
  forgetPassword: 'Forget password ?',
  email: 'Email address',
  firstName: 'First name',
  lastName: 'Last name'
}

var phrases_fr = {
  login: 'Connexion',
  signup: 'Inscription',
  username: 'Nom d\'utilisateur',
  password: 'Mot de passe',
  passwordConfirm: 'Confirmation du mot de passe',
  forgetPassword: 'Mot de passe oublié ?',
  email: 'Adresse e-mail',
  firstName: 'Prénom',
  lastName: 'Nom'
}

var locales = {en: phrases_en, fr: phrases_fr}

module.exports = function(locale) {
  return new Polyglot({
    phrases: locales[locale]
  });
}
