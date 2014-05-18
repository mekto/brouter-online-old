'use strict';

var zoomControl = require('./controls/zoom'),
    layersControl = require('./controls/layers');


module.exports = {
  Zoom: zoomControl.Zoom,
  zoom: zoomControl.zoom,
  Layers: layersControl.Layers,
  layers: layersControl.layers
};
