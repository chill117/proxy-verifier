'use strict';

var _ = require('underscore');
var expect = require('chai').expect;

var ProxyVerifier = require('../../');
var helpers = require('../helpers');

describe('protocol(proxy[, options], cb)', function() {

	var appServer;

	before(function() {

		appServer = helpers.createAppServer(3001, '127.0.0.1');

		ProxyVerifier._checkUrl = 'http://127.0.0.1:3001/check';
	});

	after(function() {

		appServer.http.close();
		appServer.https.close();
	});

	it('should be a function', function() {

		expect(ProxyVerifier.protocol).to.be.a('function');
	});

	var proxyServer;

	before(function() {

		proxyServer = helpers.createProxyServer(5050, '127.0.0.2');
	});

	after(function() {

		proxyServer.close();
		proxyServer.http.close();
		proxyServer.https.close();
	});

	var proxyProtocols = ['http', 'https'];

	describe('good proxies', function() {

		_.each(proxyProtocols, function(proxyProtocol) {

			it(proxyProtocol, function(done) {

				var proxy =  {
					ip_address: proxyServer[proxyProtocol].address().address,
					port: proxyServer[proxyProtocol].address().port,
					protocols: [proxyProtocol]
				};

				var targetHost = appServer.http.address().address;
				var targetPort = appServer.http.address().port;
				var url = 'http://' + targetHost + ':' + targetPort + '/check';

				var requestOptions = {
					strictSSL: false,
					proxyOptions: {
						rejectUnauthorized: false
					},
					timeout: 100
				};

				ProxyVerifier.protocol(proxy, requestOptions, function(error, result) {

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

				var proxy =  {
					ip_address: proxyServer[proxyProtocol].address().address,
					port: proxyServer[proxyProtocol].address().port,
					protocols: [wrongProtocol]
				};

				var targetHost = appServer.http.address().address;
				var targetPort = appServer.http.address().port;
				var url = 'http://' + targetHost + ':' + targetPort + '/check';

				var requestOptions = {
					strictSSL: false,
					proxyOptions: {
						rejectUnauthorized: false
					},
					timeout: 100
				};

				ProxyVerifier.protocol(proxy, requestOptions, function(error, result) {

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
});
