'use strict';

var utils = require('../utils'),
    cfg = require('../config');


var Layers = L.Control.extend({
  options: {
    position: 'topright'
  },

  initialize: function(options) {
    L.setOptions(this, options);

    var baseLayers = [{
      name: 'OpenMapSurfer',
      constructor: function() { return L.tileLayer(cfg.maps.openmapserfer.url, {attribution: cfg.maps.openmapserfer.attribution}); },
    }, {
      name: 'OSM Standard',
      constructor: function() { return L.tileLayer(cfg.maps.osm.url, {attribution: cfg.maps.osm.attribution}); }
    }, {
      name: 'OSM Cycle',
      constructor: function() { return L.tileLayer(cfg.maps.osmcycle.url, {attribution: cfg.maps.osmcycle.attribution}); }
    }, {
      name: 'OSM Transport',
      constructor: function() { return L.tileLayer(cfg.maps.osmtransport.url, {attribution: cfg.maps.osmtransport.attribution}); }
    }, {
      name: 'MapBox Terrain',
      constructor: function() { return L.mapbox.tileLayer('mekto.hgp09m7l', {attribution: cfg.maps.mapbox.attribution}); }
    }, {
      name: 'MapBox Street',
      constructor: function() { return L.mapbox.tileLayer('mekto.hj5462ii', {attribution: cfg.maps.mapbox.attribution}); }
    }, {
      name: 'Google Road',
      constructor: function() { return L.Google.tileLayer('ROADMAP', {attribution: cfg.maps.google.attribution}); }
    }, {
      name: 'Google Terrain',
      constructor: function() { return L.Google.tileLayer('TERRAIN', {attribution: cfg.maps.google.attribution}); }
    }, {
      name: 'Google Satellite',
      constructor: function() { return L.Google.tileLayer('HYBRID', {attribution: cfg.maps.google.attribution}); }
    }, {
      name: 'Google Bicycling',
      constructor: function() { return L.Google.tileLayer('ROADMAP', {layer: 'bicycling', attribution: cfg.maps.google.attribution}); }
    }, {
      name: 'Google Transit',
      constructor: function() { return L.Google.tileLayer('ROADMAP', {layer: 'transit', attribution: cfg.maps.google.attribution}); }
    }];

    var overlays = [{
      name: 'Cycling Routes',
      constructor: function() { return L.tileLayer(cfg.maps.waymarkedtrails.url, {attribution: cfg.maps.waymarkedtrails.attribution}); }
    }, {
      name: 'Hillshade',
      constructor: function() { return L.tileLayer(cfg.maps.hillshade.url, {attribution: cfg.maps.hillshade.attribution}); }
    }];

    this._layers = baseLayers;
    this._overlays = overlays;
    this._activeLayer = null;
  },

  onAdd: function(map) {
    this._map = map;

    this.control = utils.createControl(require('./layers.html'), 'layers', {
      decorators: {
        previewMap: this.previewMapDecorator.bind(this)
      }
    });
    this.control.set({
      expanded: false,
      layers: this._layers,
      overlays: this._overlays,
      activeLayer: null,
      activeOverlays: {}
    });
    this.control.on({
      toggle: this.toggle.bind(this),
      setLayer: this.setLayer.bind(this),
      toggleOverlay: this.toggleOverlay.bind(this)
    });
    this.setLayer(null, this._layers[0]);

    return this.control.el;
  },

  toggle: function(e) {
    this.control.set('expanded', !this.control.get('expanded'));
  },

  setLayer: function(e, layer) {
    if (this.control.get('activeLayer') === layer.name)
      return;

    if (this._activeLayer)
      this._map.removeLayer(this._activeLayer);

    this._activeLayer = layer.constructor();
    this._map.addLayer(this._activeLayer);
    this._activeLayer.bringToBack();
    this.control.set('activeLayer', layer.name);
  },

  toggleOverlay: function(e, overlay) {
    var activeOverlays = this.control.get('activeOverlays'),
        overlay_;

    if (!activeOverlays.hasOwnProperty(overlay.name)) {
      overlay_ = overlay.constructor();
      activeOverlays[overlay.name] = overlay_;
      this._map.addLayer(overlay_);
      overlay_.bringToFront();
    } else {
      this._map.removeLayer(activeOverlays[overlay.name]);
      delete activeOverlays[overlay.name];
    }
    this.control.update('activeOverlays');
  },

  previewMapDecorator: function(node, layer_) {
    var minimap = L.map(node, {attributionControl: false, zoomControl: false}),
        layer = layer_.constructor(),
        map = this._map;

    minimap.addLayer(layer);
    minimap.dragging.disable();
    minimap.touchZoom.disable();
    minimap.doubleClickZoom.disable();
    minimap.scrollWheelZoom.disable();

    minimap.invalidateSize();
    setView();

    function setView() {
      minimap.setView(map.getCenter(), Math.max(map.getZoom() - 1, 4));
    }

    function moved() {
      minimap.invalidateSize();
      setView();
    }
    map.on('moveend', moved);

    return {
      teardown: function() {
        map.off('moveend', moved);
        minimap.removeLayer(layer);
        minimap.remove();
      }
    };
  }
});


module.exports.Layers = Layers;

module.exports.layers = function(options) {
  return new Layers(options);
};
