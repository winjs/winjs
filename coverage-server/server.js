var http = require("http");
var fs = require('fs');
var url = require('url');

http.createServer(function(request, response) {
	request.on('data', function(data) {
		var params = url.parse(request.url,true).query;
		var fileName = params.fileName;
		fs.appendFileSync('coverage' + "-" + fileName + '.json', data);
		console.log('data');
	});
	request.on('end', function(data) {
		console.log('end');
	});
}).listen(8888);