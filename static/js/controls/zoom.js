'use strict';

var utils = require('../utils');


var Zoom = L.Control.extend({
  options: {
    position: 'topright'
  },

  onAdd: function(map) {
    this._map = map;
    this._map.on('locationfound', this._locationfound.bind(this));
    this._map.on('locationerror', this._stoplocate.bind(this));

    this.control = utils.createControl(require('./zoom.html'), 'zoom');
    this.control.on({
      zoomIn: this._zoomIn.bind(this),
      zoomOut: this._zoomOut.bind(this),
      locate: this._locate.bind(this)
    });
    this.control.set({
      locateStatus: 'off'
    });

    return this.control.el;
  },

  _zoomIn: function(e) {
    this._map.zoomIn(e.original.shiftKey ? 3 : 1);
  },

  _zoomOut: function(e) {
    this._map.zoomOut(e.original.shiftKey ? 3 : 1);
  },

  _locate: function() {
    var status = this.control.get('locateStatus');

    if (status === 'off') {
      this._map.locate({setView: true, maxZoom: 17});
      this.control.set('locateStatus', 'searching');
    } else {
      this._stoplocate();
    }
  },

  _stoplocate: function() {
    this._map.stopLocate();
    this.control.set('locateStatus', 'off');
    if (this._locationCircle) {
      this._map.removeLayer(this._locationCircle);
      this._map.removeLayer(this._locationMarker);
      this._locationCircle = null;
      this._locationMarker = null;
    }
  },

  _locationfound: function(e) {
    if (!this._locationCircle) {
      this._locationCircle = L.circle(e.latlng, e.accuracy, {
        color: '#136aec',
        fillColor: '#136aec',
        fillOpacity: 0.15,
        weight: 2,
        opacity: 0.5
      });
      this._locationMarker = L.circleMarker(e.latlng, {
        color: '#136aec',
        fillColor: '#2a93ee',
        fillOpacity: 0.7,
        weight: 2,
        opacity: 0.9,
        radius: 5
      });
      this._locationCircle.addTo(this._map);
      this._locationMarker.addTo(this._map);
    } else {
      this._locationCircle.setLatLng(e.latlng).setRadius(e.accuracy);
      this._locationMarker.setLatLng(e.latlng);
    }
    this.control.set('locateStatus', 'on');
  },
});


module.exports.Zoom = Zoom;

module.exports.zoom = function(options) {
  return new Zoom(options);
}
