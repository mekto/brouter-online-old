(function (exports) {
  var BRouter = function() {
    this.geocoder = new google.maps.Geocoder();

    this.map = null;
    this.markers = {
      'start': null,
      'finish': null
    };
    this.routeLayer = L.featureGroup();
    this.line = null;

    this.initMap();
  };

  BRouter.prototype = {
    constructor: BRouter.constructor,

    initMap: function() {
      this.map = L.map('map', {zoomControl: false}).setView([49, 18], 5);
      this.map.addLayer(this.routeLayer);
      this.initToolbox();
      this.initLayers();
    },

    initLayers: function() {
      var mapUrls = {
        cloudmade: 'http://{s}.tile.cloudmade.com/052d8e1c8e9c47038ee7ad0c3a9da06d/{styleId}/256/{z}/{x}/{y}.png',
        osm: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      };
      var attributions = {
        mapbox: '© <a href="http://www.mapbox.com">MapBox</a> Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
        cloudmade: 'Map data &copy; 2014 OpenStreetMap contributors, Imagery &copy; 2014 CloudMade',
        osm: 'Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
      };

      var baseLayers = {
        'MapBox Terrain': L.mapbox.tileLayer('mekto.hgp09m7l', {attribution: attributions.mapbox}),
        'MapBox Street': L.mapbox.tileLayer('mekto.hj5462ii', {attribution: attributions.mapbox}),
        'CloudMade': L.tileLayer(mapUrls.cloudmade, {styleId: 997, attribution: attributions.cloudmade}),
        'OSM': L.tileLayer(mapUrls.osm, {attribution: attributions.osm})
      };
      var overlays = {
        'Motorways': L.tileLayer(mapUrls.cloudmade, {styleId: 46561, attribution: attributions.cloudmade})
      };
      baseLayers['MapBox Terrain'].addTo(this.map);

      L.control.layers(baseLayers, overlays).addTo(this.map);
      L.control.zoom({position: 'topright'}).addTo(this.map);
    },

    initToolbox: function() {
      var container = document.createElement('div');
      container.id = 'toolbox';
      container.addEventListener('click', function(e) { e.stopPropagation(); e.preventDefault(); });

      if (!L.Browser.touch) {
        L.DomEvent
          .disableClickPropagation(container)
          .disableScrollPropagation(container);
      } else {
        L.DomEvent.on(container, 'click', L.DomEvent.stopPropagation);
      }

      this.toolbox = new Ractive({
        el: container,
        template: '#toolbox-tmpl',
        data: {
          source: '',
          destination: '',
          info: null
        }
      });

      this.toolbox.on('search', function(e) {
        if (e.original.keyIdentifier == 'Enter') {
          this.search(e.node.name, e.node.value);
        }
      }.bind(this));

      this.addMapControl(container, 'topleft');
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
            icon: L.mapbox.marker.icon({'marker-color': 'CC0033', 'marker-symbol': 'bicycle'}),
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

      var coords = [];
      for (i = 0; i < data.coords.length; i++) {
        coords.push(new L.LatLng(data.coords[i].lat, data.coords[i].lng));
      }

      this.line = L.Routing.line(coords);
      this.routeLayer.addLayer(this.line);
      this.map.fitBounds(this.routeLayer.getBounds());

      this.toolbox.set('info', {km: data.distance});
    },

    getDirections: function() {  
      if (this.line) {
        this.routeLayer.removeLayer(this.line);
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

  exports.BRouter = BRouter;
})(window);