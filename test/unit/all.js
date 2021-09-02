'use strict';

var _ = require('underscore');
var expect = require('chai').expect;

var ProxyVerifier = require('../../');
var helpers = require('../helpers');

describe('testAll(proxy[, options], cb)', function() {

	var appServer;

	before(function() {
		appServer = helpers.createAppServer(3001, '127.0.0.1');
	});

	after(function() {
		appServer.http.close();
		appServer.https.close();
	});

	it('should be a function', function() {
		expect(ProxyVerifier.testAll).to.be.a('function');
	});

	describe('local proxy', function() {

		var proxyProtocol = 'http';
		var proxyServer;

		before(function() {
			proxyServer = helpers.createProxyServer(5050, '0.0.0.0');
		});

		after(function() {
			proxyServer.close();
			proxyServer.http.close();
			proxyServer.https.close();
		});

		it('default proxy check service', function(done) {

			var proxy = {
				ipAddress: proxyServer[proxyProtocol].address().address,
				port: proxyServer[proxyProtocol].address().port,
				protocols: [proxyProtocol]
			};

			var options = {};

			ProxyVerifier.testAll(proxy, options, function(error, result) {

				try {
					expect(error).to.equal(null);
					expect(result).to.be.an('object');
					expect(result.anonymityLevel).to.equal('transparent');
					expect(result.tunnel).to.be.an('object');
					expect(result.tunnel.ok).to.equal(true);
					expect(result.protocols).to.be.an('object');
					expect(result.protocols[proxyProtocol]).to.be.an('object');
					expect(result.protocols[proxyProtocol].ok).to.equal(true);
				} catch (error) {
					return done(error);
				}
				done();
			});
		});
	});

	describe('good proxy', function() {

		var proxyProtocols = ['http'];
		var proxyServer;

		before(function() {
			proxyServer = helpers.createProxyServer(5050, '127.0.0.2');
		});

		after(function() {
			proxyServer.close();
			proxyServer.http.close();
			proxyServer.https.close();
		});

		_.each(proxyProtocols, function(proxyProtocol) {

			it(proxyProtocol, function(done) {

				var proxy = {
					ipAddress: proxyServer[proxyProtocol].address().address,
					port: proxyServer[proxyProtocol].address().port,
					protocols: [proxyProtocol]
				};

				var options = {
					testUrl: 'https://127.0.0.1:3002/check',
					ipAddressCheckUrl: 'http://127.0.0.1:3001/check',
					requestOptions: {
						strictSSL: false,
						agentOptions: {
							rejectUnauthorized: false
						},
						timeout: 100
					}
				};

				ProxyVerifier.testAll(proxy, options, function(error, result) {

					try {
						expect(error).to.equal(null);
						expect(result).to.be.an('object');
						expect(result.anonymityLevel).to.equal('elite');
						expect(result.tunnel).to.be.an('object');
						expect(result.tunnel.ok).to.equal(true);
						expect(result.protocols).to.be.an('object');
						expect(result.protocols[proxyProtocol]).to.be.an('object');
						expect(result.protocols[proxyProtocol].ok).to.equal(true);
					} catch (error) {
						return done(error);
					}

					done();
				});
			});
		});
	});
});
