'use strict';

var _ = require('underscore');
var expect = require('chai').expect;

var ProxyVerifier = require('../../');
var helpers = require('../helpers');

describe('request(method, url[, options], cb)', function() {

	var appServer;

	before(function() {

		appServer = helpers.createAppServer(3001, '127.0.0.1');
	});

	after(function() {

		appServer.http.close();
		appServer.https.close();
	});

	it('should be a function', function() {

		expect(ProxyVerifier.request).to.be.a('function');
	});

	it('request should succeed', function(done) {

		var host = appServer.http.address().address;
		var port = appServer.http.address().port;
		var url = 'http://' + host + ':' + port + '/check';
		var localAddress = '127.0.1.1';
		var requestOptions = {
			localAddress: localAddress
		};

		ProxyVerifier.request('get', url, requestOptions, function(error, data, status, headers) {

			try {

				expect(error).to.equal(null);
				expect(status).to.equal(200);
				expect(data).to.be.an('object');
				expect(_.has(data, 'ipAddress')).to.equal(true);
				expect(_.has(data, 'headers')).to.equal(true);
				expect(data.ipAddress).to.equal(localAddress);
				expect(data.headers).to.be.an('object');
				expect(data.headers.host).to.equal(host + ':' + port);

			} catch (error) {
				return done(error);
			}

			done();
		});
	});

	describe('options', function() {

		describe('proxy', function() {

			var proxyProtocols = ['http', 'https'];
			var targetProtocols = ['http', 'https'];
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

				describe(proxyProtocol, function() {

					_.each(targetProtocols, function(targetProtocol) {

						it(proxyProtocol + ' --> ' + targetProtocol + ' request should succeed', function(done) {

							var proxy = {
								ipAddress: proxyServer[proxyProtocol].address().address,
								port: proxyServer[proxyProtocol].address().port,
								protocols: [proxyProtocol]
							};

							var targetHost = appServer[targetProtocol].address().address;
							var targetPort = appServer[targetProtocol].address().port;
							var url = targetProtocol + '://' + targetHost + ':' + targetPort + '/check';

							var requestOptions = {
								strictSSL: false,
								proxy: proxy,
								proxyOptions: {
									rejectUnauthorized: false
								},
								timeout: 100
							};

							ProxyVerifier.request('get', url, requestOptions, function(error, data, status, headers) {

								try {

									expect(error).to.equal(null);
									expect(status).to.equal(200);
									expect(data).to.be.an('object');
									expect(_.has(data, 'ipAddress')).to.equal(true);
									expect(_.has(data, 'headers')).to.equal(true);
									expect(data.ipAddress).to.equal(proxyServer.http.address().address);
									expect(data.headers).to.be.an('object');
									expect(data.headers.host).to.equal(targetHost + ':' + targetPort);

								} catch (error) {
									return done(error);
								}

								done();
							});
						});
					});
				});
			});
		});
	});
});
