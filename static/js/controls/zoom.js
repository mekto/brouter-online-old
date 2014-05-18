'use strict';

var utils = require('../utils');


var Zoom = L.Control.extend({
  options: {
    position: 'topright'
  },

  onAdd: function(map) {
    var control;

    this._map = map;

    control = utils.createControl(require('./zoom.html'), 'zoom');
    control.on({
      zoomIn: this._zoomIn.bind(this),
      zoomOut: this._zoomOut.bind(this),
      locate: this._locate.bind(this)
    });

    return control.el;
  },

  _zoomIn: function(e) {
    this._map.zoomIn(e.original.shiftKey ? 3 : 1);
  },

  _zoomOut: function(e) {
    this._map.zoomOut(e.original.shiftKey ? 3 : 1);
  },

  _locate: function() {
    this._map.locate({setView: true});
  }
});


module.exports.Zoom = Zoom;

module.exports.zoom = function(options) {
  return new Zoom(options);
}
