'use strict';

var _ = require('underscore');
var Address4 = require('ip-address').Address4;
var Address6 = require('ip-address').Address6;
var async = require('async');
var colors = require('colors');
var fs = require('fs');
var https = require('https');
var lazy = require('lazy');
var path = require('path');
var program = require('commander');
var url = require('url');
var yauzl = require('yauzl');

var utils = require('../lib/utils');

var packageInfo = JSON.parse(fs.readFileSync(__dirname + '/../package.json', 'utf8'));

console.log(__dirname);

program
	.version(packageInfo.version)
	.option('--debug', 'debugging mode')
	.parse(process.argv);

var dataDir = __dirname + '/../data';
var tmpDir = dataDir + '/tmp';

if (!fs.existsSync(dataDir)) {
	fs.mkdirSync(dataDir);
}

if (!fs.existsSync(tmpDir)) {
	fs.mkdirSync(tmpDir);
}

function download(cb) {

	console.log('Downloading...');

	var downloadUrl = 'https://geolite.maxmind.com/download/geoip/database/GeoLite2-Country-CSV.zip';
	var fileName = path.basename(url.parse(downloadUrl).pathname);
	var file = path.join(tmpDir, fileName);

	fs.stat(file, function(error, stat) {

		if (!error && program.debug) {
			// File already exists.
			return cb(null, file);
		}

		var req = https.get(downloadUrl, function(res) {

			res.pipe(fs.createWriteStream(file))
				.on('error', cb)
				.on('close', function() {
					cb(null, file);
				});
		});

		req.on('error', cb);
	});
}

function extract(zipArchive, cb) {

	console.log('Extracting...');

	// Unzip and grab the files that we need.

	var fileNames = [
		'GeoLite2-Country-Blocks-IPv4.csv',
		'GeoLite2-Country-Blocks-IPv6.csv',
		'GeoLite2-Country-Locations-en.csv',
		'COPYRIGHT.txt',
		'LICENSE.txt'
	];

	var extracted = {};
	var called = false;

	function done(error, fileName) {

		if (called) {
			// Do nothing, because we've already called cb().
			return;
		}

		if (error) {
			called = true;
			return cb(error);
		}

		extracted[fileName] = true;

		var allFilesExtracted = _.every(fileNames, function(fileName) {
			return extracted[fileName];
		});

		if (allFilesExtracted) {
			called = true;
			return cb();
		}
	};

	yauzl.open(zipArchive, function(error, openedZipArchive) {

		if (error) {
			return done(error);
		}

		openedZipArchive.on('entry', function(entry) {

			var fileName = path.basename(entry.fileName);
			var isDirectory = /\/$/.test(fileName);

			if (!isDirectory && _.contains(fileNames, fileName)) {

				openedZipArchive.openReadStream(entry, function(error, readStream) {

					if (error) {
						return done(error);
					}

					var file = path.join(tmpDir, fileName);

					fs.stat(file, function(error, stat) {

						if (!error && program.debug) {
							// File already exists.
							return done(null, fileName);
						}

						readStream.pipe(fs.createWriteStream(file))
							.on('error', cb)
							.on('close', function() {
								done(null, fileName);
							});
					});
				});
			}
		});
	});
}

function processData(cb) {

	console.log('Processing data...');

	async.parallel({
		countryBlocksIpv4: processCountryBlocksIpv4,
		countryBlocksIpv6: processCountryBlocksIpv6,
		countryLocations: processCountryLocations
	}, cb);
}

function processCountryBlocksIpv4(cb) {

	var file = path.join(tmpDir, 'GeoLite2-Country-Blocks-IPv4.csv');
	var countryBlocksIpv4 = [];

	lazy(fs.createReadStream(file))
		.lines
		.map(function(byteArray) {
			return (new Buffer(byteArray)).toString('utf8');
		})
		.skip(1)
		.map(function(line) {

			var data = line.split(',');

			if (!data || data.length < 2) {
				console.log('Bad line '.red, line);
				return;
			}

			var geonameId = parseInt(data[1].replace(/"/g, ''));
			var ipv4Cidr = data[0].replace(/"/g, '');
			var ipv4Address = new Address4(ipv4Cidr);
			var ipv4StartAddress = ipv4Address.startAddress().correctForm();
			var ipv4EndAddress = ipv4Address.endAddress().correctForm();

			var block = {
				geoname_id: geonameId,
				ipv4_start_int: utils.ipv4ToInt(ipv4StartAddress)
			};

			if (ipv4StartAddress !== ipv4EndAddress) {

				block.ipv4_end_int = utils.ipv4ToInt(ipv4EndAddress);
			}

			countryBlocksIpv4.push(block);
		})
		.on('pipe', function() {

			cb(null, countryBlocksIpv4);
		});
}

function processCountryBlocksIpv6(cb) {

	var file = path.join(tmpDir, 'GeoLite2-Country-Blocks-IPv6.csv');
	var countryBlocksIpv6 = [];

	lazy(fs.createReadStream(file))
		.lines
		.map(function(byteArray) {
			return (new Buffer(byteArray)).toString('utf8');
		})
		.skip(1)
		.map(function(line) {

			var data = line.split(',');

			if (!data || data.length < 2) {
				console.log('Bad line '.red, line);
				return;
			}

			var geonameId = parseInt(data[1].replace(/"/g, ''));
			var ipv6Cidr = data[0].replace(/"/g, '');
			var ipv6Address = new Address6(ipv6Cidr);
			var ipv6StartAddress = ipv6Address.startAddress().correctForm();
			var ipv6EndAddress = ipv6Address.endAddress().correctForm();

			var block = {
				geoname_id: geonameId,
				ipv6_start_int_arr: utils.ipv6ToIntArray(ipv6StartAddress)
			};

			if (ipv6StartAddress !== ipv6EndAddress) {

				block.ipv6_end_int_arr = utils.ipv6ToIntArray(ipv6EndAddress);
			}

			countryBlocksIpv6.push(block);
		})
		.on('pipe', function() {

			cb(null, countryBlocksIpv6);
		});
}

function processCountryLocations(cb) {

	var file = path.join(tmpDir, 'GeoLite2-Country-Locations-en.csv');
	var countryLocations = {};

	lazy(fs.createReadStream(file))
		.lines
		.map(function(byteArray) {
			return (new Buffer(byteArray)).toString('utf8');
		})
		.skip(1)
		.map(function(line) {

			var data = line.split(',');

			if (!data || data.length < 2) {
				console.log('Bad line '.red, line);
				return;
			}

			var geonameId = parseInt(data[0].replace(/"/g, ''));
			var isoCode = data[4].replace(/"/g, '').toLowerCase();

			countryLocations[geonameId] = isoCode;
		})
		.on('pipe', function() {

			cb(null, countryLocations);
		});
}

function buildDataFiles(data, cb) {

	console.log('Building data files...');

	async.parallel([
		_.bind(buildIpv4DataFile, undefined, data),
		_.bind(buildIpv6DataFile, undefined, data)
	], function(error) {

		if (error) {
			return cb(error);
		}

		cb();
	});
}

function buildIpv4DataFile(data, cb) {

	var json = _.map(data.countryBlocksIpv4, function(item) {

		var block = {
			c: data.countryLocations[item.geoname_id],
			s: item.ipv4_start_int
		};

		if (item.ipv4_end_int) {
			block.e = item.ipv4_end_int;
		}

		return block;
	});

	var file = path.join(dataDir, 'country-ipv4.json');

	fs.writeFile(file, JSON.stringify(json), 'utf8', cb);
}

function buildIpv6DataFile(data, cb) {

	var json = _.map(data.countryBlocksIpv6, function(item) {

		var block = {
			c: data.countryLocations[item.geoname_id],
			s: item.ipv6_start_int_arr
		};

		if (item.ipv6_end_int_arr) {
			block.e = item.ipv6_end_int_arr;
		}

		return block;
	});

	var file = path.join(dataDir, 'country-ipv6.json');

	fs.writeFile(file, JSON.stringify(json), 'utf8', cb);
}

function moveTmpFilesToDataDir(cb) {

	console.log('Moving files to data directory...');

	var tmpFileNames = [
		'COPYRIGHT.txt',
		'LICENSE.txt'
	];

	async.each(tmpFileNames, function(tmpFileName, next) {

		var tmpFile = path.join(tmpDir, tmpFileName);
		var file = path.join(dataDir, tmpFileName);

		fs.rename(tmpFile, file, next);

	}, function(error) {

		if (error) {
			return cb(error);
		}

		cb();
	});
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

async.seq(download, extract, processData, buildDataFiles, moveTmpFilesToDataDir)(function(error) {

	cleanup();

	if (error) {
		console.error(error.message.red);
		return process.exit(1);
	}

	console.log('Done'.green);
	process.exit(0);
});
