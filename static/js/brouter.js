'use strict';

require('./routing');
require('./google');


var request = require('./utils').request,
    Ractive = require('./utils').Ractive,
    utils = require('./utils'),
    cfg = require('./config');


function Waypoint() {
  this.address = '';
  this.marker = null;
}

Waypoint.prototype = {
  constructor: Waypoint.constructor,

  getInfo: function() {
    return {
      address: this.address
    };
  }
};

var BRouter = function() {
  this.geocoder = new google.maps.Geocoder();

  this.map = null;
  this.waypoints = [new Waypoint(), new Waypoint()];
  this.routeLayer = L.featureGroup();
  this.line = null;
  this.elevation = null;

  this.initStorage();
  this.initMap();
};

BRouter.prototype = {
  constructor: BRouter.constructor,

  config: {
    markerIconStyles: {
      'first': {'marker-symbol': 'bicycle', 'marker-color': '4a89dc'},
      'last': {'marker-symbol': 'embassy', 'marker-color': '8cc152'}
    }
  },

  initMap: function() {
    this.map = L.map('map', {zoomControl: false}).setView([49, 18], 5);
    this.map.addLayer(this.routeLayer);
    this.initToolbox();
    this.initLayers();
  },

  initLayers: function() {
    var baseLayers = {
      'MapBox Terrain': L.mapbox.tileLayer('mekto.hgp09m7l', {attribution: cfg.maps.mapbox.attribution}),
      'MapBox Street': L.mapbox.tileLayer('mekto.hj5462ii', {attribution: cfg.maps.mapbox.attribution}),
      'Google Road': L.Google.tileLayer('ROADMAP', {attribution: cfg.maps.google.attribution}),
      'Google Terrain': L.Google.tileLayer('TERRAIN', {attribution: cfg.maps.google.attribution}),
      'Google Satellite': L.Google.tileLayer('HYBRID', {attribution: cfg.maps.google.attribution}),
      'CloudMade': L.tileLayer(cfg.maps.cloudmade.url, {styleId: 997, attribution: cfg.maps.cloudmade.attribution}),
      'OSM': L.tileLayer(cfg.maps.osm.url, {attribution: cfg.maps.osm.attribution}),
      'OSM Cycle': L.tileLayer(cfg.maps.osmcycle.url, {attribution: cfg.maps.osmcycle.attribution}),
      'OSM Transport': L.tileLayer(cfg.maps.osmtransport.url, {attribution: cfg.maps.osmtransport.attribution}),
      'OpenMapSurfer': L.tileLayer(cfg.maps.openmapserfer.url, {attribution: cfg.maps.openmapserfer.attribution})
    };
    var overlays = {
      'Hillshade': L.tileLayer(cfg.maps.hillshade.url, {attribution: cfg.maps.hillshade.attribution}),
      'Motorways': L.tileLayer(cfg.maps.cloudmade.url, {styleId: 46561, attribution: cfg.maps.cloudmade.attribution})
    };
    L.control.layers(baseLayers, overlays).addTo(this.map);
    L.control.zoom({position: 'topright'}).addTo(this.map);

    baseLayers[this.storage.activeOverlay].addTo(this.map);
    this.map.addEventListener('baselayerchange', function(e) {
      this.storage.activeOverlay = e.name;
    }.bind(this));

    this.elevation = L.control.elevation({
      position: "bottomright",
      theme: "steelblue-theme",
      width: 500,
      height: 125,
      useHeightIndicator: true,
      collapsed: true  // collapsed mode, show chart on click or mouseover
    });
    this.elevation.addTo(this.map);
  },

  initToolbox: function() {
    this.toolbox = new utils.component('toolbox');

    if (!L.Browser.touch) {
      L.DomEvent
        .disableClickPropagation(this.toolbox.el)
        .disableScrollPropagation(this.toolbox.el);
    } else {
      L.DomEvent.on(this.toolbox.el, 'click', L.DomEvent.stopPropagation);
    }

    this.toolbox.on({
      search: function(e) {
        if (e.original.keyCode === 13) {
          var waypoint = e.context;
          this.search(waypoint);
        }
      }.bind(this),

      findRoute: function(e) {
        this.findRoute();
      }.bind(this)
    });

    this.toolbox.set({
      waypoints: this.waypoints,
      profiles: {
        'trekking': 'Trekking',
        'fastbike': 'Fastbike',
        'safety': 'Safty',
        'shortest': 'Shortest',
        'car-test': 'Car'
      },
      alternatives: [0, 1, 2, 3],
      profile: 'trekking',
      alternative: 0,

      /* helper methods */
      canSearch: this.canSearch
    });

    this.addMapControl(this.toolbox.el, 'topleft');
  },

  initStorage: function() {
    this.storage = {};
    this.storage.define = function define(prop, defaultValue) {
      Object.defineProperty(this, prop, {
        get: function() {
          return window.localStorage.getItem(prop) || defaultValue;
        },
        set: function(newValue) {
          window.localStorage.setItem(prop, newValue);
        },
        configurable: true,
        enumerable: true
      });
    };

    this.storage.define('activeOverlay', 'Google Terrain');
  },

  addMapControl: function(element, position) {
    var Control = L.Control.extend({
      options: { position: position },
      onAdd: function() { return element; }
    });
    new Control().addTo(this.map);
  },

  canSearch: function() {
    for (var i = 0; i < this.waypoints.length; i++) {
      if (!this.waypoints[i].marker)
        return false;
    }
    return true;
  },

  search: function(waypoint) {
    this.geocoder.geocode({address: waypoint.address}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        var waypointIndex = this.waypoints.indexOf(waypoint);

        if (waypoint.marker)
          this.routeLayer.removeLayer(waypoint.marker);

        waypoint.marker = L.marker(new L.LatLng(results[0].geometry.location.lat(), results[0].geometry.location.lng()), {
          icon: L.mapbox.marker.icon(this.config.markerIconStyles[(waypointIndex === 0) ? 'first' : 'last']),
          draggable: true
        });
        waypoint.marker.addTo(this.routeLayer);
        this.map.panTo(waypoint.marker.getLatLng());

        this.toolbox.update();
      }
    }.bind(this));
  },

  setDirectionPath: function(data, startWaypoint, endWaypoint) {
    if (this.line) {
      this.routeLayer.removeLayer(this.line);
    }

    var coords = [], i;
    for (i = 0; i < data.coords.length; i++) {
      var latlng = new L.LatLng(data.coords[i].lat, data.coords[i].lng);
      latlng.meta = {ele: data.coords[i].ele};
      coords.push(latlng);
    }

    this.line = L.Routing.line(coords);
    this.elevation.addData(this.line.getPolyline());
    this.routeLayer.addLayer(this.line);
    this.map.fitBounds(this.routeLayer.getBounds());

    this.toolbox.set('info', {
      start: startWaypoint,
      end: endWaypoint,
      km: data.distance
    });
  },

  findRoute: function() {  
    if (this.line) {
      this.routeLayer.removeLayer(this.line);
      this.elevation.clear();
    }
    var latlngs = this.waypoints.map(function(waypoint) {
      return waypoint.marker.getLatLng();
    });
    this.line = L.polyline(latlngs, {color: '#555', weight: 1, className: 'loading-line'});
    this.routeLayer.addLayer(this.line);
    this.map.fitBounds(this.routeLayer.getBounds());

    this.toolbox.set('info', null);

    var start = this.waypoints[0].marker.getLatLng(),
        finish = this.waypoints[1].marker.getLatLng(),
        profile = this.toolbox.get('profile'),
        alternative = this.toolbox.get('alternative');

    request.get('/dir/' + start.lat + ',' + start.lng + '/' + finish.lat + ',' + finish.lng + '/' + profile + '_' + alternative)
      .end(function(response) {
        this.setDirectionPath(response.body, this.waypoints[0].getInfo(), this.waypoints[1].getInfo());
      }.bind(this));
  }
};

module.exports = BRouter;
