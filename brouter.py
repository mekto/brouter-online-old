from xml.dom import minidom
import httplib

from flask import Flask, jsonify, render_template, request
from werkzeug.urls import url_unquote


class Config(object):
    BROUTER_HOST = 'localhost:17777'


class CustomFlask(Flask):
    jinja_options = Flask.jinja_options.copy()
    jinja_options.update(dict(
        block_start_string='<%',
        block_end_string='%>',
        variable_start_string='%%',
        variable_end_string='%%',
        comment_start_string='<#',
        comment_end_string='#>',
    ))


app = CustomFlask(__name__)
app.config.from_object(Config)
app.config.from_pyfile('config.py', silent=True)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/dir')
def direction():
    conn = httplib.HTTPConnection(app.config['BROUTER_HOST'])
    conn.request('GET', '/brouter?' + url_unquote(request.query_string))
    resp = conn.getresponse()
    text = resp.read()

    domtree = minidom.parseString(text)
    nodes = domtree.getElementsByTagName('trkpt')
    info = get_info(domtree.firstChild.data)

    def format(node):
        return {'lng': float(node.getAttribute('lon')),
                'lat': float(node.getAttribute('lat')),
                'ele': float(node.firstChild.firstChild.nodeValue) if node.firstChild else None}

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
