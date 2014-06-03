var express = require('express'),
    http = require('http'),
    path = require('path');

var app = express();

var config = {
  brouter_host: 'http://localhost:17777'
};


app.use('/static', express.static('static'));


app.get('/', function(req, res) {
  res.sendfile(path.join(__dirname, 'templates/index.html'));
});


app.get('/brouter', function(request, response) {
  var path = request.url.replace(/%2C/g, ',').replace(/%7C/g, '|'),
      url = config.brouter_host + path;
  console.log(url);

  http.get(url, function(res) {
    var output = '';
    res.on('data', function(chunk) {
      output += chunk;
    });
    res.on('end', function() {
      response.send(output);
    });
  })
  .on('error', function(err) {
    console.log(err);
  });
});


app.listen(3000);
console.log('Express server listening on port 3000');
