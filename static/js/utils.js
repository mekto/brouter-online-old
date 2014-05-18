'use strict';

var Ractive = require('Ractive');


var createControl = function(template, className, options) {
  options = L.extend({
    template: template,
    el: L.DomUtil.create('div', className)
  }, options);

  var control = new Ractive(options);
  L.DomEvent
    .disableClickPropagation(control.el)
    .disableScrollPropagation(control.el);

  return control;
};


module.exports = {
  createControl: createControl
};
