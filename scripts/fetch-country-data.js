'use strict';

var _ = require('underscore');
var async = require('async');
var colors = require('colors');
var fs = require('fs');
var https = require('https');
var lazy = require('lazy');
var path = require('path');
var program = require('commander');
var unzip = require('unzip');
var url = require('url');
var zlib = require('zlib');

var utils = require('../lib/utils');

var packageInfo = JSON.parse(fs.readFileSync(__dirname + '/../package.json', 'utf8'));

program
	.version(packageInfo.version)
	.option('-o, --overwrite', 'overwrite existing data files')
	.option('--debug', 'debugging mode (leave tmp files)')
	.parse(process.argv);

var dataDir = __dirname + '/../data';
var tmpDir = dataDir + '/tmp';

if (!fs.existsSync(dataDir)) {
	fs.mkdirSync(dataDir);
}

if (!fs.existsSync(tmpDir)) {
	fs.mkdirSync(tmpDir);
}

var dataFiles = [
	{
		name: 'country-ipv4',
		url: 'https://geolite.maxmind.com/download/geoip/database/GeoIPCountryCSV.zip',
		process: [
			function(tmpFile, dataFile, cb) {

				// Unzip and grab the csv file.
				fs.createReadStream(tmpFile)
					.pipe(unzip.Parse())
					.on('entry', function(entry) {
						var fileName = path.basename(entry.path);
						var type = entry.type;
						if (type.toLowerCase() === 'file' && path.extname(fileName) === '.csv') {
							tmpFile = path.join(tmpDir, fileName);
							entry.pipe(fs.createWriteStream(tmpFile)).on('close', function() {
								cb(null, tmpFile, dataFile);
							});
						} else {
							entry.autodrain();
						}
					});
			},
			function(tmpFile, dataFile, cb) {

				var newTmpFile = tmpFile.substr(0, tmpFile.length - path.extname(tmpFile).length) + '.json';
				var countryData = [];

				lazy(fs.createReadStream(tmpFile))
					.lines
					.map(function(byteArray) {
						return (new Buffer(byteArray)).toString('utf8');
					})
					.map(function(line) {

						var data = line.split(',');

						if (!data || data.length < 4) {
							console.log('Bad line ', line);
							return;
						}

						// Two letter country code:
						var countryCode = data[4].replace(/"/g, '').toLowerCase();

						// Use the int version of the IP address:
						var rangeStart = parseInt(data[2].replace(/"/g, ''));

						countryData.push({
							cc: countryCode,
							rs: rangeStart
						});
					})
					.on('pipe', function() {

						fs.writeFile(newTmpFile, JSON.stringify(countryData), function(error) {

							if (error) {
								return cb(error);
							}

							cb(null, newTmpFile, dataFile);
						})
					});
			}
		]
	}
];

function downloadDataFile(dataFile, cb) {

	console.log('Downloading ' + dataFile.name + '...');

	var tmpFileName = path.basename(url.parse(dataFile.url).pathname);
	var tmpFile = path.join(tmpDir, tmpFileName);

	fs.stat(tmpFile, function(error, stat) {

		if (!error && !program.overwrite) {
			// File exists.
			console.log('Already downloaded.');
			return cb(null, tmpFile, dataFile);
		}

		var req = https.get(dataFile.url, function(res) {

			var tmpFilePipe;
			var writableStream = fs.createWriteStream(tmpFile);

			if (path.extname(tmpFile) === '.gz') {
				tmpFilePipe = res.pipe(zlib.createGunzip()).pipe(writableStream);
			} else {
				tmpFilePipe = res.pipe(writableStream);
			}

			tmpFilePipe.on('close', function() {
				cb(null, tmpFile, dataFile);
			});
		});

		req.on('error', cb);
	});
}

function processDataFile(tmpFile, dataFile, cb) {

	console.log('Processing ' + dataFile.name + '...');

	async.seq.apply(async, dataFile.process || [])(tmpFile, dataFile, cb);
}

function moveToDataDir(tmpFile, dataFile, cb) {

	fs.rename(tmpFile, path.join(dataDir, dataFile.name), cb);
}

function cleanup() {

	console.log('Cleaning up...');

	if (!program.debug) {

		var tmpFiles = fs.readdirSync(tmpDir);

		_.each(tmpFiles, function(tmpFile) {
			fs.unlinkSync(path.join(tmpDir, tmpFile));
		});

		fs.rmdirSync(tmpDir);
	}
}

console.log('Fetching data files...');

async.each(dataFiles, function(dataFile, cb) {

	async.seq(downloadDataFile, processDataFile, moveToDataDir)(dataFile, cb);

}, function(error) {

	cleanup();

	if (error) {
		console.error(error.message.red);
		return process.exit(1);
	}

	console.log('Done'.green);
	process.exit(0);
});
