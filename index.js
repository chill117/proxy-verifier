'use strict';

var _ = require('underscore');
var async = require('async');
var deprecate = require('depd')('ProxyVerifier')
var GeoIpNativeLite = require('geoip-native-lite');
var ProxyAgent = require('proxy-agent');
var request = require('request');
var url = require('url');

var ProxyVerifier = module.exports = {

	_protocolTestUrl: 'http://bitproxies.eu/api/v2/check',
	_anonymityTestUrl: 'http://bitproxies.eu/api/v2/check',
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

				var workingProtocol = _.first(workingProtocols);

				asyncTests.anonymityLevel = function(next) {

					var testAnonymityLevelOptions = _.extend({}, options, {
						withProxy: [
							protocolsResult[workingProtocol].data,
							protocolsResult[workingProtocol].status,
							protocolsResult[workingProtocol].headers
						]
					});

					ProxyVerifier.testAnonymityLevel(proxy, testAnonymityLevelOptions, next);
				};

				asyncTests.tunnel = function(next) {

					ProxyVerifier.testTunnel(proxy, options, next);
				};
			}

			ProxyVerifier.loadCountryData(function(error) {

				if (error) {
					return cb(error);
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

					results.country = ProxyVerifier.lookupCountry(proxy);

					cb(null, results);
				});
			});
		});
	},

	testTunnel: function(proxy, options, cb) {

		if (_.isUndefined(cb)) {
			cb = options;
			options = null
		}

		options || (options = {});
		proxy = ProxyVerifier.normalizeProxy(proxy);

		var testUrl = ProxyVerifier._tunnelTestUrl;

		var requestOptions = _.extend({}, options, {
			proxy: _.clone(proxy)
		});

		var results = [];
		var succeeded = false;
		var numAttempts = 0;
		var maxAttempts = !_.isUndefined(options.maxAttempts) && options.maxAttempts || 1;
		var waitTime = !_.isUndefined(options.waitTimeBetweenAttempts) && options.waitTimeBetweenAttempts || 0;

		async.until(function() { return succeeded || numAttempts >= maxAttempts; }, function(nextAttempt) {

			numAttempts++;

			ProxyVerifier.request('get', testUrl, requestOptions, function(error, data, status, headers) {

				var result;

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

				if (result.ok) {
					succeeded = true;
				}

				results.push(result);

				setTimeout(nextAttempt, succeeded ? 0 : waitTime);
			});

		}, function(error) {

			if (error) {
				return cb(error);
			}

			cb(null, _.last(results));
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

		if (_.isUndefined(cb)) {
			cb = options;
			options = null
		}

		options || (options = {});
		proxy = ProxyVerifier.normalizeProxy(proxy);

		var testUrl = ProxyVerifier._protocolTestUrl;

		var requestOptions = _.extend({}, options, {
			proxy:	_.clone(proxy)
		});

		ProxyVerifier.request('get', testUrl, requestOptions, function(error, data, status, headers) {

			var result;

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

			cb(null, result);
		});
	},

	testAnonymityLevel: function(proxy, options, cb) {

		if (_.isUndefined(cb)) {
			cb = options;
			options = null
		}

		options || (options = {});
		proxy = ProxyVerifier.normalizeProxy(proxy);

		var testUrl = ProxyVerifier._anonymityTestUrl;

		async.parallel({

			withProxy: function(next) {

				if (options.withProxy) {
					// Already have sample data from proxy checking service.
					return next(null, options.withProxy);
				}

				var requestOptions = _.extend({}, options, { proxy: proxy });

				ProxyVerifier.request('get', testUrl, requestOptions, next);
			},

			withoutProxy: function(next) {

				if (options.withoutProxy) {
					// Already have sample data from proxy checking service.
					return next(null, options.withoutProxy);
				}

				var requestOptions = options;

				ProxyVerifier.request('get', testUrl, requestOptions, next);
			}

		}, function(error, results) {

			if (error) {
				return cb(error);
			}

			var anonymityLevel;

			var withProxy = {
				data: results.withProxy[0],
				status: results.withProxy[1],
				headers: results.withProxy[2]
			};

			var withoutProxy = {
				data: results.withoutProxy[0],
				status: results.withoutProxy[1],
				headers: results.withoutProxy[2]
			};

			if (
				withoutProxy.status !== 200 ||
				!_.isObject(withoutProxy.data) ||
				!_.has(withoutProxy.data, 'ipAddress') ||
				!_.has(withoutProxy.data, 'headers')
			) {
				return cb(new Error('Failed to reach proxy checking service.'));
			}

			if (
				withProxy.status !== 200 ||
				!_.isObject(withProxy.data) ||
				!_.has(withProxy.data, 'ipAddress') ||
				!_.has(withProxy.data, 'headers')
			) {
				return cb(new Error('Failed to reach proxy checking service via proxy.'));
			}

			var myIpAddress = withoutProxy.data.ipAddress;

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

	lookupCountry: function(proxy) {

		proxy = ProxyVerifier.normalizeProxy(proxy);

		return GeoIpNativeLite.lookup(proxy.ipAddress);
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
			var proxyOptions = _.extend(
				{},
				url.parse(proxyProtocol + '://' + proxy.ipAddress + ':' + proxy.port),
				options.proxyOptions || {}
			);

			requestOptions.agent = new ProxyAgent(proxyOptions);

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

		req.on('response', function(res) {

			res.setEncoding('utf8');

			var responseData = '';

			res.on('data', function(chunk) {

				responseData += chunk;
			});

			res.on('end', function() {

				if (res.headers['content-type'] && res.headers['content-type'].indexOf('application/json') !== -1) {

					try {
						responseData = JSON.parse(responseData);
					} catch (error) {
						res.destroy();
						return cb(error);
					}
				}

				res.destroy();

				cb(null, responseData, res.statusCode, res.headers);
			});
		});

		req.on('error', function(error) {
			cb(error);
		});

		req.end();
	},

	loadCountryData: function(options, cb) {

		GeoIpNativeLite.loadData(options, cb);
	},

	loadCountryDataSync: function(options) {

		return GeoIpNativeLite.loadDataSync(options);
	},

	normalizeProxy: function(proxy) {

		return {
			ipAddress: proxy.ipAddress || proxy.ip_address || null,
			port: proxy.port || null,
			protocols: proxy.protocols || (proxy.protocol && [proxy.protocol]) || null,
			auth: proxy.auth || null
		};
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
ProxyVerifier.country = deprecate.function(
	ProxyVerifier.lookupCountry,
	'country() has been deprecated; use lookupCountry() instead'
);
