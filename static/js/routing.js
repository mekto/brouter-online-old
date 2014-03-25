'use strict';

L.Routing = L.Routing || {};

L.Routing.Line = L.FeatureGroup.extend({
    initialize: function(latlangs, options) {
        this._layers = {};
        this._options = options;
        this.setLatLangs(latlangs);
    },

    setLatLangs: function(latlngs) {
        var styles = [
            {color: 'black', opacity: 0.15, weight: 7},
            {color: 'white', opacity: 0.8, weight: 4},
            {color: 'orange', opacity: 1, weight: 2}
        ];
        this.clearLayers();

        for (var i = 0; i < styles.length; i++) {
            this.addLayer(L.polyline(latlngs, styles[i]));
        }

        return this;
    },

    getLatLangs: function() {
        this._lines[0].getLatLngs();
    }
});

L.Routing.line = function(latlngs) {
  return new L.Routing.Line(latlngs);
};
