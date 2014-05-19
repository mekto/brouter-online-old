'use strict';

require('./routing');
require('./google');


var request = require('superagent'),
    Ractive = require('Ractive'),
    Controls = require('./controls.js');


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

var App = function() {
  this.geocoder = new google.maps.Geocoder();

  this.map = null;
  this.waypoints = [new Waypoint(), new Waypoint()];
  this.routeLayer = L.featureGroup();
  this.line = null;
  this.request = null;

  this.initStorage();
  this.initMap();
};

App.prototype = {
  constructor: App.constructor,

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
  },

  initLayers: function() {
    Controls.layers().addTo(this.map);
    Controls.zoom().addTo(this.map);

    this.map.attributionControl.setPrefix('');
    this.map.attributionControl.addAttribution(
      '© <a href="http://leafletjs.com" title="A JS library for interactive maps">Leaflet</a>, ' +
      'Routing © <a href="http://dr-brenschede.de/brouter/">BRouter</a>');

    this.map.addEventListener('baselayerchange', function(e) {
      this.storage.activeOverlay = e.name;
    }.bind(this));

    this.map.addEventListener('click', function(e) {
      if (e.originalEvent.shiftKey) {
        this.map.setZoomAround(e.latlng, this.map.getZoom() + 3);
      }
      if (e.originalEvent.ctrlKey) {
        this.showLocationPopup(e.latlng);
      }
    }.bind(this));

    this.map.addEventListener('contextmenu', function(e) {
      this.showLocationPopup(e.latlng);
      e.originalEvent.preventDefault();
    }.bind(this));
  },

  initToolbox: function() {
    this.toolbox = new Ractive({
      template: require('./templates/toolbox.html'),
      el: document.createElement('div')
    });

    L.DomEvent
      .disableClickPropagation(this.toolbox.el)
      .disableScrollPropagation(this.toolbox.el);

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

  showLocationPopup: function(latlng) {
    this.lookupAddress(latlng, function(result) {
      var content = new Ractive({
        el: document.createElement('div'),
        template: require('./templates/address-popup.html'),
        data: {
          address: this.getAddressComponents(result),
          latlng: latlng,
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
        .setLatLng(latlng)
        .setContent(content.el)
        .openOn(this.map);
    }.bind(this));
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
      return waypoint.marker;
    });
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
    if (this.map.getZoom() < 13)
      this.map.setView(waypoint.marker.getLatLng(), 14);
    else
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


window.addEventListener('load', function() {
  window.app = new App();
});
