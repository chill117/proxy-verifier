'use strict';

var _ = require('underscore');
var async = require('async');
var deprecate = require('depd')('ProxyVerifier');
var GeoIpNativeLite = require('geoip-native-lite');
var ProxyAgent = require('proxy-agent');
var request = require('request');
var url = require('url');

var httpStatusCodes = require('./httpStatusCodes');

var ProxyVerifier = module.exports = {

	_defaultTestUrl: 'http://bitproxies.eu/api/v2/check',
	_ipAddressCheckUrl: 'https://bitproxies.eu/api/v2/check',
	_tunnelTestUrl: 'https://bitproxies.eu/api/v2/check',

	/*
		Array of header keys for exact matching.
	*/
	_proxyHeaders: ['via'],

	/*
		Array of header keywords for loose matching.
	*/
	_proxyRelatedHeaderKeywords: ['proxy'],

	testAll: function(proxy, options, cb) {

		if (_.isUndefined(cb)) {
			cb = options;
			options = null
		}

		options || (options = {});

		// Tells the request module to measure the elapsed time for each request.
		options.time = true;

		proxy = ProxyVerifier.normalizeProxy(proxy);

		var testProtocolsOptions = _.extend({}, options, { includeAll: true });

		ProxyVerifier.testProtocols(proxy, testProtocolsOptions, function(error, protocolsResult) {

			if (error) {
				return cb(error);
			}

			var workingProtocols = _.filter(_.keys(protocolsResult), function(protocol) {
				return protocolsResult[protocol].ok === true;
			});

			proxy.protocols = workingProtocols;

			var asyncTests = {};

			if (!_.isEmpty(workingProtocols)) {

				asyncTests.anonymityLevel = function(next) {
					var testAnonymityLevelOptions = _.extend({}, options);
					ProxyVerifier.testAnonymityLevel(proxy, testAnonymityLevelOptions, next);
				};

				asyncTests.tunnel = function(next) {
					ProxyVerifier.testTunnel(proxy, options, next);
				};
			}

			async.parallel(asyncTests, function(error, results) {

				if (error) {
					return cb(error);
				}

				results.protocols = _.object(_.map(_.keys(protocolsResult), function(protocol) {
					return [protocol, _.omit(protocolsResult[protocol], 'data', 'status', 'headers')]
				}));

				if (_.isEmpty(workingProtocols)) {
					results.anonymityLevel = null;
					results.tunnel = { ok: false };
				}

				cb(null, results);
			});
		});
	},

	testProtocols: function(proxy, options, cb) {

		if (_.isUndefined(cb)) {
			cb = options;
			options = null
		}

		options || (options = {});
		proxy = ProxyVerifier.normalizeProxy(proxy);

		if (!_.isArray(proxy.protocols)) {
			throw new Error('Invalid "protocols" attribute: Array expected.');
		}

		if (!proxy.protocols || _.isEmpty(proxy.protocols)) {
			throw new Error('Must specify some protocols to test.');
		}

		var tests = _.object(_.map(proxy.protocols, function(protocol) {
			var _proxy = _.extend({}, proxy, { protocol: protocol });
			return [protocol, _.bind(ProxyVerifier.testProtocol, undefined, _proxy, options)];
		}));

		async.parallel(tests, cb);
	},

	testProtocol: function(proxy, options, cb) {

		ProxyVerifier.test(proxy, options, cb);
	},

	testAnonymityLevel: function(proxy, options, cb) {

		if (_.isUndefined(cb)) {
			cb = options;
			options = null
		}

		options = (options || {});

		async.parallel({

			myIpAddress: function(next) {

				if (options.myIpAddress) {
					// Already have our IP address for comparison.
					return next(null, options.myIpAddress);
				}

				ProxyVerifier.getMyIpAddress(options, next);
			},

			test: function(next) {

				var testOptions = _.extend({}, options, { includeAll: true });

				ProxyVerifier.test(proxy, testOptions, function(error, result) {

					if (error || result.error) {

						if (!error) {

							error = new Error(result.error.message);

							if (result.error.code) {
								error.code = result.error.code;
							}
						}

						return next(error);
					}

					next(null, result);
				});
			}

		}, function(error, results) {

			if (error) {
				return cb(error);
			}

			var anonymityLevel;
			var myIpAddress = results.myIpAddress;
			var withProxy = results.test;

			// If the requesting host's IP address is in any of the headers, then "transparent".
			if (withProxy.data.ipAddress === myIpAddress || _.contains(_.values(withProxy.data.headers), myIpAddress)) {
				anonymityLevel = 'transparent';
			} else {

				var proxyHeaders = ProxyVerifier._proxyHeaders;
				var proxyKeywords = ProxyVerifier._proxyRelatedHeaderKeywords;
				var headerKeys = _.keys(withProxy.data.headers);

				var hasProxyHeaders = _.some(proxyHeaders, function(proxyHeader) {
					return _.contains(headerKeys, proxyHeader) || _.some(headerKeys, function(headerKey) {
						return _.some(proxyKeywords, function(proxyKeyword) {
							return headerKey.indexOf(proxyKeyword) !== -1;
						});
					});
				});

				if (hasProxyHeaders) {
					anonymityLevel = 'anonymous';
				} else {
					anonymityLevel = 'elite';
				}
			}

			cb(null, anonymityLevel);
		});
	},

	getMyIpAddress: function(options, cb) {

		if (_.isUndefined(cb)) {
			cb = options;
			options = null
		}

		options = _.defaults(options || {}, {
			ipAddressCheckUrl: ProxyVerifier._ipAddressCheckUrl,
			ipAddressCheckFn: ProxyVerifier._getIpAddressFromCheckProxyServiceResponse
		});

		ProxyVerifier.request('get', options.ipAddressCheckUrl, options, function(error, data, status, headers) {

			if (error) {
				return cb(error);
			}

			try {
				var ipAddress = options.ipAddressCheckFn(data, status, headers);	
			} catch (error) {
				return cb(error);
			}

			cb(null, ipAddress);
		});
	},

	testTunnel: function(proxy, options, cb) {

		if (_.isUndefined(cb)) {
			cb = options;
			options = null
		}

		options = _.defaults(options || {}, {
			testUrl: ProxyVerifier._tunnelTestUrl,
			maxAttempts: 5,
			waitTimeBetweenAttempts: 0
		});

		ProxyVerifier.test(proxy, options, cb);
	},

	test: function(proxy, options, cb) {

		if (_.isUndefined(cb)) {
			cb = options;
			options = null
		}

		if (!_.isObject(proxy)) {
			throw new Error('Expected "proxy" to be an object.');
		}

		if (!_.isObject(options)) {
			throw new Error('Expected "options" to be an object.');
		}

		if (!_.isObject(cb)) {
			throw new Error('Expected "cb" to be a function.');
		}

		options = _.defaults(options || {}, {
			testUrl: ProxyVerifier._defaultTestUrl,
			testFn: ProxyVerifier._checkProxyServiceResponse,
			maxAttempts: 1,
			waitTimeBetweenAttempts: 0
		});

		var requestOptions = _.extend({}, options.requestOptions || {}, {
			proxy: ProxyVerifier.normalizeProxy(proxy)
		});

		var result;
		var numAttempts = 0;

		async.until(function() {

			// Retry the test until successful or have reached the maximum number of attempts.
			return (result && result.ok === true) || numAttempts >= options.maxAttempts;

		}, function(nextAttempt) {

			numAttempts++;

			ProxyVerifier.request('get', options.testUrl, requestOptions, function(error, data, status, headers) {

				if (!error) {

					try {
						options.testFn(data, status, headers);
					} catch (testError) {
						error = testError;
					}
				}

				if (error) {

					result = {
						ok: false,
						error: {
							message: error.message,
							code: error.code
						}
					};

				} else {

					result = {
						ok: true
					};
				}

				if (options.includeAll) {
					result.data = data;
					result.status = status;
					result.headers = headers;
				}

				// Don't wait in the case of success.
				setTimeout(nextAttempt, result.ok === true ? 0 : options.waitTimeBetweenAttempts);
			});

		}, function(error) {

			if (error) {
				return cb(error);
			}

			cb(null, result);
		});
	},

	request: function(method, uri, options, cb) {

		cb = _.last(arguments);
		options || (options = {});

		if (options.proxy) {
			options.proxy = ProxyVerifier.normalizeProxy(options.proxy);
		}

		var requestOptions = _.extend({}, _.omit(options, 'proxy', 'data'), {
			method: method.toUpperCase(),
			url: uri,
			headers: {}
		});

		if (options.proxy) {

			var proxy = options.proxy;
			var proxyProtocol = _.first(proxy.protocols);
			var agentOptions = _.extend(
				{},
				url.parse(proxyProtocol + '://' + proxy.ipAddress + ':' + proxy.port),
				options.agentOptions || {}
			);

			requestOptions.agent = new ProxyAgent(agentOptions);

			if (proxy.auth) {
				requestOptions.headers['Proxy-Authorization'] = proxy.auth;
			}
		}

		if (options.data) {

			switch (method) {

				case 'GET':
				case 'DELETE':
					requestOptions.qs = options.data;
					break;

				case 'POST':
				case 'PUT':
					requestOptions.json = options.data;
					break;
			}
		}

		var req = request(requestOptions);
		var done = _.once(cb);

		req.on('response', function(res) {

			res.setEncoding('utf8');

			var responseData = '';
			var status = res.statusCode;
			var headers = res.headers;

			res.on('data', function(chunk) {
				responseData += chunk;
			});

			res.on('end', function() {

				res.destroy();

				if (headers['content-type'] && headers['content-type'].indexOf('application/json') !== -1) {

					try {
						responseData = JSON.parse(responseData);
					} catch (error) {
						return done(error);
					}
				}

				done(null, responseData, status, headers);
			});
		});

		req.on('error', done);
		req.end();

		return req;
	},

	normalizeProxy: function(proxy) {

		proxy = ProxyVerifier._deepClone(proxy);

		return {
			ipAddress: proxy.ipAddress || proxy.ip_address || null,
			port: proxy.port || null,
			protocols: proxy.protocols || (proxy.protocol && [proxy.protocol]) || null,
			auth: proxy.auth || null
		};
	},

	_deepClone: function(object) {

		return JSON.parse(JSON.stringify(object));
	},

	_getIpAddressFromCheckProxyServiceResponse: function(data, status, headers) {

		ProxyVerifier._checkProxyServiceResponse(data, status, headers);
		return data.ipAddress;
	},

	_checkProxyServiceResponse: function(data, status, headers) {

		var error;

		if (status >= 300) {
			error = new Error(httpStatusCodes[status] || '');
			error.code = 'HTTP_ERROR_' + status;
		} else if (status !== 200 && !_.isObject(data) && !_.has(data, 'ipAddress') && !_.has(data, 'headers')) {
			error = new Error('Failed to reach proxy check service.');
			error.code = 'FAILED_TO_REACH_PROXY_SERVICE';
		}

		if (!_.isUndefined(error)) {
			throw error;
		}
	}
};

// For backwards compatibility, but with deprecated warnings.

ProxyVerifier.all = deprecate.function(
	ProxyVerifier.testAll,
	'all() has been deprecated; use testAll() instead'
);

ProxyVerifier.protocol = deprecate.function(
	ProxyVerifier.testProtocol,
	'protocol() has been deprecated; use testProtocol() instead'
);

ProxyVerifier.protocols = deprecate.function(
	ProxyVerifier.testProtocols,
	'protocols() has been deprecated; use testProtocols() instead'
);

ProxyVerifier.anonymityLevel = deprecate.function(
	ProxyVerifier.testAnonymityLevel,
	'anonymityLevel() has been deprecated; use testAnonymityLevel() instead'
);

ProxyVerifier.tunnel = deprecate.function(
	ProxyVerifier.testTunnel,
	'tunnel() has been deprecated; use testTunnel() instead'
);

var lookupCountry = function(proxy) {
	proxy = ProxyVerifier.normalizeProxy(proxy);
	return GeoIpNativeLite.lookup(proxy.ipAddress);
};

ProxyVerifier.lookupCountry = deprecate.function(
	lookupCountry,
	'lookupCountry() has been deprecated and will be removed in a future release'
);

ProxyVerifier.country = deprecate.function(
	lookupCountry,
	'country() has been deprecated and will be removed in a future release'
);

ProxyVerifier.loadCountryData = deprecate.function(
	function(options, cb) {
		GeoIpNativeLite.loadData(options, cb);
	},
	'loadCountryData() has been deprecated and will be removed in a future release'
);

ProxyVerifier.loadCountryDataSync = deprecate.function(
	function(options) {
		return GeoIpNativeLite.loadDataSync(options);
	},
	'loadCountryDataSync() has been deprecated and will be removed in a future release'
);
