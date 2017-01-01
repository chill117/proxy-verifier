'use strict';

var _ = require('underscore');
var expect = require('chai').expect;

var ProxyVerifier = require('../../');
var helpers = require('../helpers');

describe('testProtocol(proxy[, options], cb)', function() {

	var appServer;

	before(function() {
		appServer = helpers.createAppServer(3001, '127.0.0.1');
	});

	var proxyServer;

	before(function() {
		proxyServer = helpers.createProxyServer(5050, '127.0.0.2');
	});

	after(function() {
		appServer.http.close();
		appServer.https.close();
	});

	after(function() {
		proxyServer.close();
		proxyServer.http.close();
		proxyServer.https.close();
	});

	it('should be a function', function() {
		expect(ProxyVerifier.testProtocol).to.be.a('function');
	});

	var proxyProtocols = ['http', 'https'];

	describe('good proxies', function() {

		_.each(proxyProtocols, function(proxyProtocol) {

			it(proxyProtocol, function(done) {

				var proxy = {
					ipAddress: proxyServer[proxyProtocol].address().address,
					port: proxyServer[proxyProtocol].address().port,
					protocols: [proxyProtocol]
				};

				var options = {
					testUrl: 'http://127.0.0.1:3001/check',
					requestOptions: {
						strictSSL: false,
						agentOptions: {
							rejectUnauthorized: false
						},
						timeout: 100
					}
				};

				ProxyVerifier.testProtocol(proxy, options, function(error, result) {

					try {
						expect(error).to.equal(null);
						expect(result).to.be.an('object');
						expect(result.ok).to.equal(true);
						expect(result.error).to.equal(undefined);
					} catch (error) {
						return done(error);
					}

					done();
				});
			});
		});
	});

	describe('mismatched protocol', function() {

		_.each(proxyProtocols, function(proxyProtocol) {

			var wrongProtocol = _.find(proxyProtocols, function(protocol) {
				return protocol !== proxyProtocol;
			});

			it(proxyProtocol + ' as ' + wrongProtocol, function(done) {

				var proxy = {
					ipAddress: proxyServer[proxyProtocol].address().address,
					port: proxyServer[proxyProtocol].address().port,
					protocols: [wrongProtocol]
				};

				var options = {
					testUrl: 'http://127.0.0.1:3001/check',
					requestOptions: {
						strictSSL: false,
						agentOptions: {
							rejectUnauthorized: false
						},
						timeout: 100
					}
				};

				ProxyVerifier.testProtocol(proxy, options, function(error, result) {

					try {
						expect(error).to.equal(null);
						expect(result).to.be.an('object');
						expect(result.ok).to.equal(false);
						expect(result.error).to.not.equal(undefined);
					} catch (error) {
						return done(error);
					}

					done();
				});
			});
		});
	});

	describe('auth', function() {

		var auth = {
			user: 'test',
			pass: 'somepassword'
		};

		var proxyServerWithAuth;

		before(function() {

			proxyServerWithAuth = helpers.createProxyServer(5051, '127.0.0.3', {
				proxyAuth: auth
			});
		});

		after(function() {

			proxyServerWithAuth.close();
			proxyServerWithAuth.http.close();
			proxyServerWithAuth.https.close();
		});

		it('with correct authentication credentials', function(done) {

			var proxyProtocol = 'http';

			var proxy = {
				ipAddress: proxyServerWithAuth[proxyProtocol].address().address,
				port: proxyServerWithAuth[proxyProtocol].address().port,
				protocols: [proxyProtocol]
			};

			var options = {
				testUrl: 'http://127.0.0.1:3001/check',
				requestOptions: {
					strictSSL: false,
					agentOptions: {
						rejectUnauthorized: false
					},
					timeout: 100,
					auth: auth
				}
			};

			ProxyVerifier.testProtocol(proxy, options, function(error, result) {

				try {
					expect(error).to.equal(null);
					expect(result).to.be.an('object');
					expect(result.ok).to.equal(true);
					expect(result.error).to.equal(undefined);
				} catch (error) {
					return done(error);
				}

				done();
			});
		});

		it('with incorrect authentication credentials', function(done) {

			var proxyProtocol = 'http';

			var proxy = {
				ipAddress: proxyServerWithAuth[proxyProtocol].address().address,
				port: proxyServerWithAuth[proxyProtocol].address().port,
				protocols: [proxyProtocol]
			};

			var options = {
				testUrl: 'http://127.0.0.1:3001/check',
				requestOptions: {
					strictSSL: false,
					agentOptions: {
						rejectUnauthorized: false
					},
					timeout: 100,
					auth: {
						user: 'test',
						pass: 'incorrect-password'
					}
				}
			};

			ProxyVerifier.testProtocol(proxy, options, function(error, result) {

				try {
					expect(error).to.equal(null);
					expect(result).to.be.an('object');
					expect(result.ok).to.equal(false);
					expect(result.error).to.be.an('object');
					expect(result.error.code).to.equal('HTTP_ERROR_407');
				} catch (error) {
					return done(error);
				}

				done();
			});
		});
	});
});
