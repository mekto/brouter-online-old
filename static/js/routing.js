'use strict';

L.Routing = L.Routing || {};

L.Routing.Line = L.FeatureGroup.extend({
    initialize: function(latlangs, options) {
        L.LayerGroup.prototype.initialize.call(this);
        this._options = options;
        this.setLatLangs(latlangs);
    },

    setLatLangs: function(latlngs) {
        var styles = [
            {color: 'black', opacity: 0.15, weight: 7},
            {color: 'white', opacity: 0.8, weight: 4},
            {color: '#FF851B', opacity: 1, weight: 3}
        ];
        this.clearLayers();

        for (var i = 0; i < styles.length; i++) {
            this.addLayer(L.polyline(latlngs, styles[i]));
        }

        return this;
    },

    getPolyline: function() {
        var layers = this.getLayers();
        return layers[0];
    },
});

L.Routing.line = function(latlngs) {
  return new L.Routing.Line(latlngs);
};
