module.exports = {
  maps: {
    mapbox: {
      attribution: 'Map data © <a href="http://openstreetmap.org/copyright">OpenStreetMap contributors</a>, Tiles © <a href="http://www.mapbox.com">MapBox</a>'
    },
    osm: {
      url: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: 'Map data and tiles © <a href="http://openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    },
    osmcycle: {
      url: 'http://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png',
      attribution: 'Map data © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>, Tiles © <a href="http://www.thunderforest.com">Thunderforest</a>'
    },
    osmtransport: {
      url: 'http://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png',
      attribution: 'Map data © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>, Tiles © <a href="http://www.thunderforest.com">Thunderforest</a>'
    },
    openmapserfer: {
      url: 'http://openmapsurfer.uni-hd.de/tiles/roads/x={x}&y={y}&z={z}',
      attribution: 'Map data © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>, Tiles © <a href="http://openmapsurfer.uni-hd.de/">GIScience Research Group @ University of Heidelberg</a>'
    },
    hillshade: {
      // ASTER GDEM & SRTM Hillshade layer
      url: 'hhttp://openmapsurfer.uni-hd.de/tiles/asterh/x={x}&y={y}&z={z}',
      attribution: 'Map data © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>, Tiles © <a href="http://openmapsurfer.uni-hd.de/">GIScience Research Group @ University of Heidelberg</a>'
    },
    waymarkedtrails: {
      url: 'http://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png',
      attirbution: 'Overlay © <a href="http://cycling.waymarkedtrails.org">cycling.waymarkedtrails.org</a>'
    },
    google: {
      attribution: 'Map data and tiles © <a href="http://www.google.com">Google</a>'
    }
  }
};
