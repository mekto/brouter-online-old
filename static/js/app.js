'use strict';

require('./routing');
require('./google');


var Ractive = require('Ractive'),
    Controls = require('./controls.js'),
    config = require('../../config.js');

require('Ractive.decorators.sortable');


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
    this.map = L.map('map', {zoomControl: false, minZoom: 2});
    if (window.geolocation)
      this.map.setView([window.geolocation.lat, window.geolocation.lon], 12);
    else
      this.map.setView([49, 18], 4);
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
    this.toolbox = require('./toolbox');
    this.toolbox.set('waypoints', this.waypoints);

    this.toolbox.on({
      search: function(waypoint) {
        this.search(waypoint);
      }.bind(this),

      findRoute: function() {
        this.findRoute({force: true});
      }.bind(this),

      sorted: function(keypath) {
        if (keypath === 'waypoints') {
          this.updateMarkerIcons();
          this.findRoute();
        }
      }.bind(this)
    });

    this.toolbox.control().addTo(this.map);
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

  canSearch: function() {
    return this.waypoints.every(function(waypoint) {
      return waypoint.marker;
    });
  },

  distanceBetweenWaypoints: function() {
    return this.waypoints.reduce(function(first, second) {
      if (first.marker && second.marker) {
        return first.marker.getLatLng().distanceTo(second.marker.getLatLng());
      }
      return 0;
    });
  },

  search: function(waypoint) {
    var bounds = this.map.getBounds(),
      southWest = bounds.getSouthWest(),
      northEast = bounds.getNorthEast();
    bounds = new google.maps.LatLngBounds(new google.maps.LatLng(southWest.lat, southWest.lng),
                                          new google.maps.LatLng(northEast.lat, northEast.lng));
    this.geocoder.geocode({address: waypoint.address, bounds: bounds}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        this.setMarker(waypoint, new L.LatLng(results[0].geometry.location.lat(), results[0].geometry.location.lng()));
      }
    }.bind(this));
  },

  makeMarkerIcon: function(waypoint) {
    var index = this.waypoints.indexOf(waypoint),
        type = (index === 0) ? 'start' :
               (index < this.waypoints.length - 1) ? 'via' : 'end';

    return L.divIcon({
      iconSize: [20, 32],
      iconAnchor: [10, 32],
      className: type + '-marker',
      html: require('../svg/marker.svg')
    });
  },

  setMarker: function(waypoint, latlng) {
    if (waypoint.marker)
      this.routeLayer.removeLayer(waypoint.marker);

    waypoint.marker = L.marker(latlng, {
      icon: this.makeMarkerIcon(waypoint),
      draggable: true
    });
    waypoint.marker.waypoint = waypoint;  // reverse mapping
    waypoint.marker.addTo(this.routeLayer);

    waypoint.marker.addEventListener('dragend', function(e) {
      this.searchAddressReverse(e.target);
    }.bind(this));

    if (this.canSearch()) {
      this.findRoute();
    } else {
      if (this.map.getZoom() < 13)
        this.map.setView(waypoint.marker.getLatLng(), 14);
      else
        this.map.panTo(waypoint.marker.getLatLng());
    }
    this.toolbox.update();
  },

  updateMarkerIcons: function() {
    this.waypoints.forEach(function(waypoint) {
      if (waypoint.marker) {
        waypoint.marker.setIcon(this.makeMarkerIcon(waypoint));
      }
    }, this);
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

  setDirectionPath: function(xml, options) {
    if (this.line) {
      this.routeLayer.removeLayer(this.line);
    }
    if (!xml) {
      this.toolbox.set('info', { warning: 'Cannot calculate route.' });
      return;
    }

    var nodes = xml.getElementsByTagName('trkpt'), coords = [], i,
        comment = xml.firstChild.textContent, distance;
    distance = parseInt(comment.match(/track-length = (\d+)/)[1]) / 1000;

    Array.prototype.forEach.call(nodes, function(node) {
      var latlng = new L.LatLng(parseFloat(node.attributes.lat.value), parseFloat(node.attributes.lon.value));
      latlng.meta = {ele: (node.firstElementChild) ? parseFloat(node.firstElementChild.textContent) : null};
      coords.push(latlng);
    });

    this.line = L.Routing.line(coords);
    this.routeLayer.addLayer(this.line);
    if (options.fitBounds) {
      this.map.fitBounds(this.routeLayer.getBounds(), { paddingTopLeft: [290, 38], paddingBottomRight: [30, 30] });
    }

    this.toolbox.setRouteInfo(this.waypoints, coords, distance);
  },

  findRoute: function(options) {
    if (!this.canSearch()) {
      return false;
    }
    options = L.extend({ fitBounds: true, force: false }, options || {});

    this.map.closePopup();
    if (this.line) {
      this.routeLayer.removeLayer(this.line);
    }

    this.toolbox.set('info', null);
    this.toolbox.set('chart', null);

    var latlngs = this.waypoints.map(function(waypoint) {
      return waypoint.marker.getLatLng();
    });
    if (options.fitBounds) {
      this.map.fitBounds(this.routeLayer.getBounds(), { paddingTopLeft: [290, 38], paddingBottomRight: [30, 30] });
    }

    var distance = this.distanceBetweenWaypoints();
    if (distance > config.maxDistance) {
      this.toolbox.set('info', { warning: 'The distance is too long to calculate a route.'});
      return false;
    }
    if (distance > config.maxAutoCalculationDistance && !options.force) {
      this.toolbox.set('info', { warning: 'Press <i>Find route</i> to calculate.'});
      return false;
    }

    this.line = L.polyline(latlngs, {color: '#555', weight: 1, className: 'loading-line'});
    this.routeLayer.addLayer(this.line);

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

    var url = L.Util.template(config.brouterHost + '/brouter?lonlats={lonlats}&profile={profile}&alternativeidx={alternativeidx}&format={format}', {
      lonlats: lonlats,
      profile: profile,
      alternativeidx: alternative,
      format: 'gpx'
    });

    var request = this.request = new XMLHttpRequest(url);
    request.open('GET', url, true);
    request.onload = function() {
      if (request.status === 200) {
        this.setDirectionPath(request.responseXML, options);
      }
      this.request = null;
    }.bind(this);
    request.send();

    return true;
  }
};


window.addEventListener('load', function() {
  window.app = new App();
});
