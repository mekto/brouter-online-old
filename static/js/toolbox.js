'use strict';

var Ractive = require('Ractive');


var toolbox = module.exports = new Ractive({
  template: require('./templates/toolbox.html'),
  el: document.createElement('div'),
});

toolbox.set({
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
});

toolbox.on({
  'keydown': function(e) {
    if (e.original.keyCode === 13) {
      var waypoint = e.context;
      this.fire('search', waypoint);
    }
  }
});

toolbox.control = function() {
  var Control = L.Control.extend({
    options: { position: 'topleft' },
    onAdd: function(map) {
      toolbox.map = map;

      L.DomEvent
        .disableClickPropagation(toolbox.el)
        .disableScrollPropagation(toolbox.el);

      return toolbox.el;
    }
  });
  return new Control();
};

toolbox.setRouteInfo = function(waypoints, coords, distance) {
  toolbox.set('info', {
    waypoints: waypoints.map(function(waypoint) {
      return waypoint.getInfo();
    }),
    km: distance
  });
  drawElevationChart(coords);
};

var drawElevationChart = function(coords) {
  var width = 215,
      height = 90,
      data = [],
      dist = 0,
      eleExtent, min, max,
      i;

  for (i = 0; i < coords.length; i++) {
    var s = coords[i];
    var e = coords[i ? i - 1 : 0];
    var newdist = s.distanceTo(e);
    dist += Math.ceil(newdist / 1000 * 100000) / 100000;
    data.push({
      dist: dist,
      alt: s.meta.ele,
      latlng: s
    });
  }

  eleExtent = scaleExtent(data, function(p) { return p.alt; });
  min = eleExtent[0];
  max = eleExtent[1];
  if (max - min < 160) {
    max = min + 160;
  }

  toolbox.set('chart', {
    width: width,
    height: height,
    data: data,
    dist: dist,
    min: min,
    max: max,
    xScale: linearScale([0, dist], [0, width]),
    yScale: linearScale([min, max], [height, 0]),
    xScaleTicks: linearTickRange([0, dist], 5),
    yScaleTicks: linearTickRange([min, max], 5),

    band: function() {
      var xScale = this.get('chart.xScale'),
          yScale = this.get('chart.yScale');
      var points = getPointsArray(data, xScale, yScale);
      return points.join(' ');
    },

    round: function(value) {
      return Math.round(value);
    }
  });
};


/*
  Returns a function that scales a value from a given domain to a given range.
*/
var linearScale = function(domain, range) {
  var d0 = domain[0], r0 = range[0], multipler = (range[1] - r0) / (domain[1] - d0);

  return function(num) {
    return r0 + ((num - d0) * multipler);
  };
};

/*
  Takes an array of values, and returns an array of
  points plotted according to the given x scale and y scale
*/
var getPointsArray = function(array, xScale, yScale) {
  return array.map(function(point, i) {
    return xScale(point.dist) + ',' + yScale(point.alt);
  });
};

/*
  Returns the minimum and maximum value in given array.
*/
function scaleExtent(array, accessor) {
  if (accessor) {
    array = array.map(accessor);
  }
  return [Math.min.apply(null, array), Math.max.apply(null, array)];
}


var linearTickRange = function(domain, m) {
  var extent = scaleExtent(domain),
      span = extent[1] - extent[0],
      step = Math.pow(10, Math.floor(Math.log(span / m) / Math.LN10)),
      err = m / span * step,
      range = [],
      i = 0,
      j;

  if (err <= 0.15) step *= 10;
  else if (err <= 0.35) step *= 5;
  else if (err <= 0.75) step *= 2;

  var start = Math.ceil(extent[0] / step) * step;
  var stop = Math.floor(extent[1] / step) * step + step * 0.5;

  while ((j = start + step * i++) < stop)
    range.push(j);

  return range;
};

