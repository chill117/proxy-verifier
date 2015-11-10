'use strict';

module.exports = {
	src: [
		'grunt/*.js',
		'lib/*.js',
		'scripts/*.js',
		'test/**/*.js',
		'gruntFile.js',
		'index.js'
	],
	options: {
		config: '.jscsrc',
		requireCurlyBraces: [ 'if', 'for', 'while' ]
	}
};
