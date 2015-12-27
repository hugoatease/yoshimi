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
  lastName: 'Last name',
  emailOrUsername: 'Email or username',
  emailValidation: 'Email validation'
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
  lastName: 'Nom',
  emailOrUsername: 'E-mail ou nom d\'utilisateur',
  emailValidation: 'Validation d\'adresse mail'
}

var locales = {en: phrases_en, fr: phrases_fr}

module.exports = function(locale) {
  return new Polyglot({
    phrases: locales[locale]
  });
}
