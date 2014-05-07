from xml.dom import minidom
import httplib

from flask import Flask, jsonify, render_template, request
from werkzeug.urls import url_unquote


app = Flask(__name__)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/dir')
def direction():
    conn = httplib.HTTPConnection('h2096617.stratoserver.net:443')
    conn.request('GET', '/brouter?' + url_unquote(request.query_string))
    resp = conn.getresponse()

    domtree = minidom.parseString(resp.read())
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
