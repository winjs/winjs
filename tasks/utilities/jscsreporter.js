var util = require('util');


module.exports = function(errorsCollection) {
    errorsCollection.forEach(function(errors) {
        if (!errors.isEmpty()) {
            var file = errors.getFilename();
            var out = errors.getErrorList().map(function(error) {
                return util.format('%s: line %d, col %d, %s', file, error.line, error.column + 1, error.message);
            });
            console.log(out.join('\n'));
        }
    });
};