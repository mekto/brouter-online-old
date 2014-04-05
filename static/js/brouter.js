'use strict';

require('./routing');


var request = require('./utils').request,
    Ractive = require('./utils').Ractive,
    utils = require('./utils'),
    cfg = require('./config');


var BRouter = function() {
  this.geocoder = new google.maps.Geocoder();

  this.map = null;
  this.markers = {
    'start': null,
    'finish': null
  };
  this.routeLayer = L.featureGroup();
  this.line = null;
  this.elevation = null;

  this.initMap();
};

BRouter.prototype = {
  constructor: BRouter.constructor,

  config: {
    markerColors: {
      'start': '4a89dc',
      'finish': '8cc152'
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
      'CloudMade': L.tileLayer(cfg.maps.cloudmade.url, {styleId: 997, attribution: cfg.maps.cloudmade.attribution}),
      'OSM': L.tileLayer(cfg.maps.osm.url, {attribution: cfg.maps.osm.attribution})
    };
    var overlays = {
      'Motorways': L.tileLayer(cfg.maps.cloudmade.url, {styleId: 46561, attribution: cfg.maps.cloudmade.attribution})
    };
    baseLayers['MapBox Terrain'].addTo(this.map);

    L.control.layers(baseLayers, overlays).addTo(this.map);
    L.control.zoom({position: 'topright'}).addTo(this.map);

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

    this.toolbox.on('search', function(e) {
      if (e.original.keyCode === 13) {
        this.search(e.node.name, e.node.value);
      }
    }.bind(this));

    this.addMapControl(this.toolbox.el, 'topleft');
  },

  addMapControl: function(element, position) {
    var Control = L.Control.extend({
      options: { position: position },
      onAdd: function() { return element; }
    });
    new Control().addTo(this.map);
  },

  setMarker: function(type, newMarker) {
    var marker = this.markers[type];
    if (marker)
       this.routeLayer.removeLayer(marker);
    this.markers[type] = newMarker;
  },

  search: function(type, address) {
    this.geocoder.geocode({address: address}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        var marker = L.marker(new L.LatLng(results[0].geometry.location.lat(), results[0].geometry.location.lng()), {
          icon: L.mapbox.marker.icon({'marker-color': this.config.markerColors[type], 'marker-symbol': 'bicycle'}),
          draggable: true
        });
        this.setMarker(type, marker);
        marker.addTo(this.routeLayer);
        this.map.panTo(marker.getLatLng());

        if (this.hasStartAndFinish())
          this.getDirections();
      }
    }.bind(this));
  },

  hasStartAndFinish: function() {
    return this.markers.start && this.markers.finish;
  },

  setDirectionPath: function(data) {
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

    this.toolbox.set('info', {km: data.distance});
  },

  getDirections: function() {  
    if (this.line) {
      this.routeLayer.removeLayer(this.line);
      this.elevation.clear();
    }
    this.line = L.polyline([this.markers.start.getLatLng(), this.markers.finish.getLatLng()], {color: '#555', weight: 1, className: 'loading-line'});
    this.routeLayer.addLayer(this.line);
    this.map.fitBounds(this.routeLayer.getBounds());

    this.toolbox.set('info', null);

    var start = this.markers.start.getLatLng(),
        finish = this.markers.finish.getLatLng();
    request.get('/dir/' + start.lat + ',' + start.lng + '/' + finish.lat + ',' + finish.lng)
      .end(function(response) {
        this.setDirectionPath(response.body);
      }.bind(this));
  }
};

module.exports = BRouter;
