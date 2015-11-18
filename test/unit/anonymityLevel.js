'use strict';

var _ = require('underscore');
var async = require('async');
var expect = require('chai').expect;

var ProxyVerifier = require('../../');
var helpers = require('../helpers');

describe('anonymityLevel(proxy[, options], cb)', function() {

	var appServer;

	before(function() {

		appServer = helpers.createAppServer(3001, '127.0.0.1');

		ProxyVerifier._anonymityTestUrl = 'http://127.0.0.1:3001/check';
	});

	after(function() {

		appServer.http.close();
		appServer.https.close();
	});

	var proxyServers = {
		anonymous: [],
		elite: [],
		transparent: []
	};

	before(function() {

		// Create "elite" proxy server(s).
		var elite1 = helpers.createProxyServer(5050, '127.0.0.2');

		// Create "anonymous" proxy server(s).
		var anonymous1 = helpers.createProxyServer(5060, '127.0.0.10');
		var anonymous2 = helpers.createProxyServer(5062, '127.0.0.11');

		anonymous1.on('proxyReq', function(proxyReq, req, res, options) {
			proxyReq.setHeader('Via', 'someproxy');
		});

		anonymous2.on('proxyReq', function(proxyReq, req, res, options) {
			proxyReq.setHeader('X-Proxy-Header', 'some-custom-header');
		});

		// Create "transparent" proxy server(s).
		var transparent1 = helpers.createProxyServer(5070, '127.0.0.20', { xfwd: true });

		proxyServers.elite.push.apply(proxyServers.elite, [elite1]);
		proxyServers.anonymous.push.apply(proxyServers.anonymous, [anonymous1, anonymous2]);
		proxyServers.transparent.push.apply(proxyServers.transparent, [transparent1]);
	});

	after(function() {

		_.each(Array.prototype.concat.apply([], _.values(proxyServers)), function(proxyServer) {

			proxyServer.close();
			proxyServer.http.close();
			proxyServer.https.close();
		});
	});

	it('should be a function', function() {

		expect(ProxyVerifier.anonymityLevel).to.be.a('function');
	});

	_.each(_.keys(proxyServers), function(anonymityLevel) {

		it(anonymityLevel, function(done) {

			async.times(proxyServers[anonymityLevel].length, function(index, next) {

				var proxyServer = proxyServers[anonymityLevel][index];

				var proxy =  {
					ip_address: proxyServer.http.address().address,
					port: proxyServer.http.address().port,
					protocols: ['http']
				};

				var targetHost = appServer.http.address().address;
				var targetPort = appServer.http.address().port;
				var url = 'http://' + targetHost + ':' + targetPort + '/check';

				var requestOptions = {
					strictSSL: false,
					proxyOptions: {
						rejectUnauthorized: false
					}
				};

				ProxyVerifier.anonymityLevel(proxy, requestOptions, function(error, result) {

					try {
						expect(error).to.equal(null);
						expect(result).to.equal(anonymityLevel);
					} catch (error) {
						return next(new Error(error.message + ' (server #' + (index + 1) + ')'));
					}

					next();
				});

			}, done);
		});
	});
});
