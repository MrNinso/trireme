var assert = require('assert');
var http = require('http');
var util = require('util');

var svr = http.createServer(function(req, resp) {
  console.log('Got an HTTP request');
  req.on('readable', function() {
    var chunk = req.read();
    console.log('Server got data: ' + chunk);
  });
  req.on('end', function() {
    console.log('Server got end');
    resp.end('Hello, World!');
  });
});

console.log('Server starting to listen');
svr.listen(0, function() {
  console.log('Server listening');
  var url = util.format('http://localhost:%d', svr.address().port);
  http.get(url, function(resp) {
    var received = '';
    console.log('Got a response with status code ' + resp.statusCode);
    resp.setEncoding('utf8');
    if (resp.statusCode != 200) {
      process.exit(1);
    }
    resp.on('readable', function() {
      var chunk = resp.read();
      console.log(chunk);
      received += chunk;
    });
    resp.on('end', function() {
      console.log('Got the whole response');
      svr.close();
      assert.equal('Hello, World!', received);
    });
  });
});
