var polyglot = require('../polyglot');

module.exports = function(lang, id) {
  return polyglot(lang).t(id);
}
