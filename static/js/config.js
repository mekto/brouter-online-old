module.exports = {
  maps: {
    mapbox: {
      attribution: '© <a href="http://www.mapbox.com">MapBox</a> Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
    },
    cloudmade: {
      url: 'http://{s}.tile.cloudmade.com/052d8e1c8e9c47038ee7ad0c3a9da06d/{styleId}/256/{z}/{x}/{y}.png',
      attribution: 'Map data © 2014 OpenStreetMap contributors, Imagery © 2014 CloudMade'
    },
    osm: {
      url: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: 'Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
    },
    osmcycle: {
      url: 'http://{s}.tile.opencyclemap.org/cycle/{z}/{x}/{y}.png',
      attribution: '© <a href="http://www.opencyclemap.org">OpenCycleMap</a>, © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>'
    },
    osmtransport: {
      url: 'http://{s}.tile2.opencyclemap.org/transport/{z}/{x}/{y}.png',
      attribution: '© <a href="http://www.opencyclemap.org">OpenCycleMap</a>, © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>'
    },
    openmapserfer: {
      url: 'http://129.206.74.245:8001/tms_r.ashx?x={x}&y={y}&z={z}',
      attribution: 'Imagery from <a href="http://giscience.uni-hd.de/">GIScience Research Group @ University of Heidelberg</a> &mdash; Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>'
    },
    google: {
      attribution: '© <a href="http://www.google.com">Google</a>'
    },
    hillshade: {
      // ASTER GDEM & SRTM Hillshade layer
      // http://openmapsurfer.uni-hd.de/
      url: 'http://129.206.74.245:8004/tms_hs.ashx?x={x}&y={y}&z={z}',
      attribution: 'Imagery from <a href="http://giscience.uni-hd.de/">GIScience Research Group @ University of Heidelberg</a> &mdash; Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>'
    }
  }
};
