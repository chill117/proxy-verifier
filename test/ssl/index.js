'use strict';

var fs = require('fs');

module.exports = {
	cert: fs.readFileSync(__dirname + '/server.crt', 'utf8'),
	key: fs.readFileSync(__dirname + '/server.key', 'utf8')
};
