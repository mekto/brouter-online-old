from xml.dom import minidom

import requests
from flask import Flask, jsonify, render_template, url_for


app = Flask(__name__)


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/dir/<start>/<finish>')
def direction(start, finish):
    start_lat, start_lng = start.split(',')
    finish_lat, finish_lng = finish.split(',')

    coords = '{start_lng}_{start_lat}_{finish_lng}_{finish_lat}_{profile}' \
        .format(start_lng=start_lng, start_lat=start_lat,
                finish_lng=finish_lng, finish_lat=finish_lat,
                profile='trekking_0')

    url = 'http://h2096617.stratoserver.net/cgi-bin/brouter.sh?coords=' + coords
    response = requests.get(url)

    domtree = minidom.parseString(response.text)
    nodes = domtree.getElementsByTagName('trkpt')
    info = get_info(domtree.firstChild.data)

    def format(node):
        return {'lng': float(node.getAttribute('lon')),
                'lat': float(node.getAttribute('lat')),
                'ele': float(node.firstChild.firstChild.nodeValue)}

    return jsonify({
        'distance': float(info['track-length']) / 1000,
        'coords': map(format, nodes)
    })


def get_info(gpx_comment_data):
	# Example data:
    # track-length = 7969 filtered ascend = 12 plain-ascend = 3 cost=9083 
    info = gpx_comment_data.strip().replace(' = ', '=')
    info = info.replace('filtered ascend', 'filtered-ascend')
    info = info.split(' ')
    info = map(lambda row: row.split('='), info)
    return {key: value for key, value in info}


if __name__ == "__main__":
    app.run(host='0.0.0.0', debug=True)
