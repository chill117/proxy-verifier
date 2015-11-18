'use strict';

var _ = require('underscore');
var async = require('async');
var GeoIpNativeLite = require('geoip-native-lite');
var ProxyAgent = require('proxy-agent');
var request = require('request');
var url = require('url');

var ProxyVerifier = module.exports = {

	_protocolTestUrl: 'http://bitproxies.eu/api/v1/check',
	_anonymityTestUrl: 'http://bitproxies.eu/api/v1/check',
	_tunnelTestUrl: 'https://www.google.com',

	/*
		Array of header keys for exact matching.
	*/
	_proxyHeaders: ['via'],

	/*
		Array of header keywords for loose matching.
	*/
	_proxyRelatedHeaderKeywords: ['proxy'],

	all: function(proxy, options, cb) {

		if (_.isUndefined(cb)) {
			cb = options;
			options = null
		}

		options || (options = {});

		var asyncTests = ['anonymityLevel', 'tunnel'];

		if (_.has(proxy, 'protocols')) {
			asyncTests.push('protocols');
		} else if (_.has(proxy, 'protocol')) {
			asyncTests.push('protocol');
		}

		var tasks = _.object(_.map(asyncTests, function(asyncTest) {
			return [asyncTest, function(next) {
				ProxyVerifier[asyncTest](proxy, options, function(error, result) {
					next(null, result || null);
				});
			}];
		}));

		tasks.countryData = _.bind(ProxyVerifier.loadCountryData, ProxyVerifier);

		async.parallel(tasks, function(error, results) {

			if (error) {
				return cb(error);
			}

			results = _.omit(results, 'countryData');
			results.country = ProxyVerifier.country(proxy);

			cb(null, results);
		});
	},

	tunnel: function(proxy, options, cb) {

		if (_.isUndefined(cb)) {
			cb = options;
			options = null
		}

		options || (options = {});

		var testUrl = ProxyVerifier._tunnelTestUrl;

		var requestOptions = _.extend({}, options, {
			proxy:	_.clone(proxy)
		});

		ProxyVerifier.request('get', testUrl, requestOptions, function(error) {

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

			cb(null, result);
		});
	},

	protocols: function(proxy, options, cb) {

		if (_.isUndefined(cb)) {
			cb = options;
			options = null
		}

		options || (options = {});

		if (!_.isArray(proxy.protocols)) {
			throw new Error('Invalid "protocols" attribute: Array expected.');
		}

		if (!proxy.protocols || _.isEmpty(proxy.protocols)) {
			throw new Error('Must specify some protocols to test.');
		}

		var tests = _.object(_.map(proxy.protocols, function(protocol) {
			var _proxy = _.extend({}, proxy, { protocol: protocol });
			return [protocol, _.bind(ProxyVerifier.protocol, undefined, _proxy, options)];
		}));

		async.parallel(tests, cb);
	},

	protocol: function(proxy, options, cb) {

		if (_.isUndefined(cb)) {
			cb = options;
			options = null
		}

		options || (options = {});

		var testUrl = ProxyVerifier._protocolTestUrl;

		var requestOptions = _.extend({}, options, {
			proxy:	_.clone(proxy)
		});

		ProxyVerifier.request('get', testUrl, requestOptions, function(error) {

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

			cb(null, result);
		});
	},

	anonymityLevel: function(proxy, options, cb) {

		if (_.isUndefined(cb)) {
			cb = options;
			options = null
		}

		options || (options = {});

		var testUrl = ProxyVerifier._anonymityTestUrl;

		async.parallel({

			withProxy: function(next) {

				var requestOptions = _.extend({}, options, { proxy: proxy });

				ProxyVerifier.request('get', testUrl, requestOptions, next);
			},

			withoutProxy: function(next) {

				var requestOptions = options;

				ProxyVerifier.request('get', testUrl, requestOptions, next);
			}

		}, function(error, results) {

			if (error) {
				return cb(error);
			}

			var anonymityLevel;
			var withProxy = results.withProxy[0];
			var withoutProxy = results.withoutProxy[0];
			var myIpAddress = withoutProxy.ip_address;

			// If the requesting host's IP address is in any of the headers, then "transparent".
			if (withProxy.ip_address === myIpAddress || _.contains(_.values(withProxy.headers), myIpAddress)) {
				anonymityLevel = 'transparent';
			} else {

				var proxyHeaders = ProxyVerifier._proxyHeaders;
				var proxyKeywords = ProxyVerifier._proxyRelatedHeaderKeywords;
				var headerKeys = _.keys(withProxy.headers);

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

	country: function(proxy) {

		return GeoIpNativeLite.lookup(proxy.ip_address);
	},

	request: function(method, uri, options, cb) {

		cb = _.last(arguments);
		options || (options = {});

		var requestOptions = _.extend({}, _.omit(options, 'proxy', 'data'), {
			method: method.toUpperCase(),
			url: uri,
			headers: {}
		});

		if (options.proxy) {

			var proxy = options.proxy;
			var proxyProtocol = proxy.protocol || _.first(proxy.protocols);
			var proxyOptions = _.extend(
				{},
				url.parse(proxyProtocol + '://' + proxy.ip_address + ':' + proxy.port),
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
	}
};
