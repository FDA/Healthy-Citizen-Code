var http = require('http');

var server = module.exports = http.createServer(function (req, res) {

  if (req.headers['content-type'] === 'text/plain') {

    var body = '';
    req.on('data', function (chunk) {
      body += chunk.toString();
    });

    req.on('end', function () {
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end('correct header');
      server.emit('success', body);
    });

  } else {
    res.writeHead(400, {'Content-Type': 'text/plain'});
    res.end('wrong header');
  };
});