'use strict';

var _ = require('underscore');
var expect = require('chai').expect;

var ProxyVerifier = require('../../');
var helpers = require('../helpers');

describe('tunnel(proxy[, options], cb)', function() {

	var appServer;

	before(function() {

		appServer = helpers.createAppServer(3001, '127.0.0.1');

		ProxyVerifier._tunnelTestUrl = 'https://127.0.0.1:3002/check';
	});

	after(function() {

		appServer.http.close();
		appServer.https.close();
	});

	it('should be a function', function() {

		expect(ProxyVerifier.tunnel).to.be.a('function');
	});

	var proxyServers = {};

	before(function() {

		proxyServers.withTunneling = helpers.createProxyServer(5050, '127.0.0.2');
		proxyServers.withoutTunneling = helpers.createProxyServer(5051, '127.0.0.3', { tunnel: false });
	});

	after(function() {

		_.each(_.values(proxyServers), function(proxyServer) {
			proxyServer.close();
			proxyServer.http.close();
			proxyServer.https.close();
		});
	});

	it('proxy with tunneling', function(done) {

		var proxyServer = proxyServers.withTunneling;
		var proxyProtocol = 'http';
		var targetProtocol = 'https';

		var proxy = {
			ip_address: proxyServer[proxyProtocol].address().address,
			port: proxyServer[proxyProtocol].address().port,
			protocols: [proxyProtocol]
		};

		var requestOptions = {
			strictSSL: false,
			proxyOptions: {
				rejectUnauthorized: false
			},
			timeout: 100
		};

		ProxyVerifier.tunnel(proxy, requestOptions, function(error, result) {

			if (error) {
				return done(error);
			}

			try {
				expect(result).to.be.an('object');
				expect(result.ok).to.equal(true);
				expect(result.error).to.equal(undefined);
			} catch (error) {
				return done(error);
			}

			done();
		});
	});

	it('proxy without tunneling', function(done) {

		var proxyServer = proxyServers.withoutTunneling;
		var proxyProtocol = 'http';
		var targetProtocol = 'https';

		var proxy = {
			ip_address: proxyServer[proxyProtocol].address().address,
			port: proxyServer[proxyProtocol].address().port,
			protocols: [proxyProtocol]
		};

		var requestOptions = {
			strictSSL: false,
			proxyOptions: {
				rejectUnauthorized: false
			},
			timeout: 100
		};

		ProxyVerifier.tunnel(proxy, requestOptions, function(error, result) {

			if (error) {
				return done(error);
			}

			try {
				expect(result).to.be.an('object');
				expect(result.ok).to.equal(false);
				expect(result.error).to.not.equal(undefined);
				expect(result.error).to.be.an('object');
			} catch (error) {
				return done(error);
			}

			done();
		});
	});
});
