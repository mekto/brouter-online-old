import requests
from flask import Flask, request, render_template


class Config(object):
    pass


app = Flask(__name__)
app.config.from_object(Config)
app.config.from_pyfile('config.py', silent=True)


@app.route('/')
def index():
    # IP geolocation
    geolocation = None
    try:
        ip = request.remote_addr
        if ip and ip != '127.0.0.1':
            json = requests.get('http://freegeoip.net/json/{}'.format(ip),
                                timeout=0.500).json()
            geolocation = dict(
                lat=json['latitude'],
                lon=json['longitude']
            )
    except:
        pass

    return render_template('index.html', geolocation=geolocation)


if __name__ == "__main__":
    app.run(host='0.0.0.0', debug=True)
