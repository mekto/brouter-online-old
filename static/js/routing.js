'use strict';

L.Routing = L.Routing || {};

L.Routing.Line = L.FeatureGroup.extend({
    initialize: function(latlangs, options) {
        L.LayerGroup.prototype.initialize.call(this, options);
        this.setLatLangs(latlangs);
    },

    setLatLangs: function(latlngs) {
        var styles = [
            {color: '#f22', opacity: 0.9, weight: 4}
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
