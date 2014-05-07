'use strict';

require('./routing');
require('./google');
require('./vendors/leaflet-elevation/Leaflet.Elevation-0.0.2.src');
require('./vendors/leaflet-zoomslider/L.Control.Zoomslider');


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
  this.request = null;

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
    this.map = L.map('map', {zoomControl: false, minZoom: 2}).setView([49, 18], 4);
    this.map.addLayer(this.routeLayer);
    this.initToolbox();
    this.initLayers();
    this.initDelayedClick();
  },

  initDelayedClick: function() {
    var delayedClick = null;

    this.map.addEventListener('click', function(e) {
      if (delayedClick === null) {
        delayedClick = setTimeout(function() {
          this.map.fire('delayedclick', e);
          delayedClick = null;
        }.bind(this), 500);
      } else {
        clearTimeout(delayedClick);
        delayedClick = null;
      }
    }.bind(this));
  },

  initLayers: function() {
    var baseLayers = {
      'OpenMapSurfer': L.tileLayer(cfg.maps.openmapserfer.url, {attribution: cfg.maps.openmapserfer.attribution}),
      'OSM Standard': L.tileLayer(cfg.maps.osm.url, {attribution: cfg.maps.osm.attribution}),
      'OSM Cycle': L.tileLayer(cfg.maps.osmcycle.url, {attribution: cfg.maps.osmcycle.attribution}),
      'OSM Transport': L.tileLayer(cfg.maps.osmtransport.url, {attribution: cfg.maps.osmtransport.attribution}),
      'MapBox Terrain': L.mapbox.tileLayer('mekto.hgp09m7l', {attribution: cfg.maps.mapbox.attribution}),
      'MapBox Street': L.mapbox.tileLayer('mekto.hj5462ii', {attribution: cfg.maps.mapbox.attribution}),
      'Google Road': L.Google.tileLayer('ROADMAP', {attribution: cfg.maps.google.attribution}),
      'Google Terrain': L.Google.tileLayer('TERRAIN', {attribution: cfg.maps.google.attribution}),
      'Google Satellite': L.Google.tileLayer('HYBRID', {attribution: cfg.maps.google.attribution}),
      'Google Bicycling': L.Google.tileLayer('ROADMAP', {layer: 'bicycling', attribution: cfg.maps.google.attribution}),
      'Google Transit': L.Google.tileLayer('ROADMAP', {layer: 'transit', attribution: cfg.maps.google.attribution})
    };
    var overlays = {
      'Cycling Routes': L.tileLayer(cfg.maps.waymarkedtrails.url, {attribution: cfg.maps.waymarkedtrails.attribution}),
      'Hillshade': L.tileLayer(cfg.maps.hillshade.url, {attribution: cfg.maps.hillshade.attribution})
    };
    L.control.layers(baseLayers, overlays).addTo(this.map);
    L.control.zoomslider({position: 'topright'}).addTo(this.map);

    this.map.attributionControl.setPrefix('');
    this.map.attributionControl.addAttribution(
      '© <a href="http://leafletjs.com" title="A JS library for interactive maps">Leaflet</a>, ' +
      'Routing © <a href="http://dr-brenschede.de/brouter/">BRouter</a>');

    baseLayers[this.storage.activeOverlay].addTo(this.map);
    this.map.addEventListener('baselayerchange', function(e) {
      this.storage.activeOverlay = e.name;
    }.bind(this));

    this.map.addEventListener('contextmenu', function(e) {
      e.originalEvent.preventDefault();
    });

    this.map.addEventListener('click', function(e) {
      if (e.originalEvent.shiftKey) {
        this.map.setZoomAround(e.latlng, this.map.getZoom() + 3);
      }
    }.bind(this));
    this.map.addEventListener('delayedclick', function(e) {
      var latlng = e.latlng;

      if (!e.originalEvent.shiftKey) {
        this.lookupAddress(latlng, function(result) {
          var content = new Ractive({
            el: document.createElement('div'),
            template: '#address-popup',
            data: {
              address: this.getAddressComponents(result),
              latlng: e.latlng,
              format: function(value) {
                return value.toFixed(6);
              }
            }
          });
          content.on({
            'setFrom': function(e) {
              var waypoint = this.waypoints[0];
              waypoint.address = this.formatAddress(result);
              this.setMarker(waypoint, latlng);
              this.map.closePopup();
              e.original.preventDefault();
            }.bind(this),

            'setTo': function(e) {
              var waypoint = this.waypoints[this.waypoints.length - 1];
              waypoint.address = this.formatAddress(result);
              this.setMarker(waypoint, latlng);
              this.map.closePopup();
              e.original.preventDefault();
            }.bind(this),
          });

          L.popup({ minWidth: 200 })
            .setLatLng(e.latlng)
            .setContent(content.el)
            .openOn(this.map);
        }.bind(this));
      }
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
      canSearch: this.canSearch.bind(this)
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

    this.storage.define('activeOverlay', 'OpenMapSurfer');
  },

  addMapControl: function(element, position) {
    var Control = L.Control.extend({
      options: { position: position },
      onAdd: function() { return element; }
    });
    new Control().addTo(this.map);
  },

  canSearch: function() {
    return this.waypoints.every(function(waypoint) {
      return waypoint.marker
    });
    return true;
  },

  search: function(waypoint) {
    this.geocoder.geocode({address: waypoint.address}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        this.setMarker(waypoint, new L.LatLng(results[0].geometry.location.lat(), results[0].geometry.location.lng()));
      }
    }.bind(this));
  },

  setMarker: function(waypoint, latlng) {
    var waypointIndex = this.waypoints.indexOf(waypoint);

    if (waypoint.marker)
      this.routeLayer.removeLayer(waypoint.marker);

    waypoint.marker = L.marker(latlng, {
      icon: L.mapbox.marker.icon(this.config.markerIconStyles[(waypointIndex === 0) ? 'first' : 'last']),
      draggable: true
    });
    waypoint.marker.waypoint = waypoint;  // reverse mapping
    waypoint.marker.addTo(this.routeLayer);
    this.map.panTo(waypoint.marker.getLatLng());

    waypoint.marker.addEventListener('dragend', function(e) {
      this.searchAddressReverse(e.target);
    }.bind(this));

    this.toolbox.update();
    this.findRoute();
  },

  lookupAddress: function(latlng, callback) {
    latlng = new google.maps.LatLng(latlng.lat, latlng.lng);
    this.geocoder.geocode({'latLng': latlng}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        if (results[0]) {
          callback(results[0]);
        }
      }
    }.bind(this));
  },

  searchAddressReverse: function(marker) {
    var latlng = marker.getLatLng();
    this.lookupAddress(latlng, function(result) {
      marker.waypoint.address = this.formatAddress(result);
      this.toolbox.update();
      this.findRoute({ fitBounds: false });
    }.bind(this));
  },

  getAddressComponents: function(geocoderResult) {
    var components = geocoderResult.formatted_address.split(',').map(function(component) {
      return component.trim();
    });
    if (components.length > 1) {
      components.pop();
    }
    return components;
  },

  formatAddress: function(geocoderResult) {
    return this.getAddressComponents(geocoderResult).join(', ');
  },

  setDirectionPath: function(data, options) {
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
    if (options.fitBounds) {
      this.map.fitBounds(this.routeLayer.getBounds());
    }

    this.toolbox.set('info', {
      waypoints: this.waypoints.map(function(waypoint) {
        return waypoint.getInfo();
      }),
      km: data.distance
    });
  },

  findRoute: function(options) {
    if (!this.canSearch()) {
      return;
    }
    options = L.extend({ fitBounds: true }, options || {});

    this.map.closePopup();
    if (this.line) {
      this.routeLayer.removeLayer(this.line);
      this.elevation.clear();
    }
    var latlngs = this.waypoints.map(function(waypoint) {
      return waypoint.marker.getLatLng();
    });
    this.line = L.polyline(latlngs, {color: '#555', weight: 1, className: 'loading-line'});
    this.routeLayer.addLayer(this.line);
    if (options.fitBounds) {
      this.map.fitBounds(this.routeLayer.getBounds());
    }

    this.toolbox.set('info', null);

    var profile = this.toolbox.get('profile'),
        alternative = this.toolbox.get('alternative'),
        lonlats;

    lonlats = this.waypoints.map(function(waypoint) {
      var latlng = waypoint.marker.getLatLng();
      return [latlng.lng, latlng.lat].join(',');
    }).join('|');

    if (this.request) {
      this.request.abort();
      this.request = null;
    }
    this.request = request.get('/dir')
      .query({
        lonlats: lonlats,
        profile: profile,
        alternativeidx: alternative,
        format: 'gpx'
      })
      .end(function(response) {
        this.setDirectionPath(response.body, options);
        this.request = null;
      }.bind(this));
  }
};

module.exports = BRouter;
