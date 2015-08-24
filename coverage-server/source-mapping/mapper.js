var istanbulSourceMap = require('istanbul-coverage-source-map');
var fs = require('fs');

var files = fs.readdirSync('../base-ui-coverage-reports');

for(var i = 0; i < files.length; i+=1){
	var file = files[i];
	if(file.indexOf('.json') > -1){
		console.log('Reading: ' + file);
		var opt = {
			encoding: "utf8"
		}
		var covObj = fs.readFileSync('../base-ui-coverage-reports/' + file, opt);
		console.log('Converting: ' + file)
		covObj = istanbulSourceMap(covObj);
		console.log('Writing: ' + file);
		fs.writeFileSync('../all-coverage-reports/' + file, covObj);
	}
}