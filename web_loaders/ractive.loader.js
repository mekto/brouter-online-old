module.exports = function(str) {
  this.cacheable();
  var Ractive = require('../static/js/vendors/Ractive.js');
  return 'module.exports = ' + JSON.stringify(Ractive.parse(str)) + ';';
};
