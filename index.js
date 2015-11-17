'use strict';

var _ = require('underscore');
var async = require('async');
var fs = require('fs');
var net = require('net');
var ProxyAgent = require('proxy-agent');
var request = require('request');
var url = require('url');

var utils = require('./lib/utils');

var countryData = {};

var ProxyVerifier = module.exports = {

	_dataDir: __dirname + '/data',
	_checkUrl: 'http://bitproxies.eu/api/v1/check',

	/*
		Array of header keys for exact matching.
	*/
	_proxyHeaders: ['via'],

	/*
		Array of header keywords for loose matching.
	*/
	_proxyRelatedHeaderKeywords: ['proxy'],

	check: {

		protocols: function(proxy, options, cb) {

			if (_.isUndefined(cb)) {
				cb = cb;
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
				return [protocol, _.bind(ProxyVerifier.check.protocol, undefined, _proxy, options)];
			}));

			async.parallel(tests, cb);
		},

		protocol: function(proxy, options, cb) {

			if (_.isUndefined(cb)) {
				cb = cb;
				options = null
			}

			options || (options = {});

			var checkUrl = ProxyVerifier._checkUrl;

			var requestOptions = _.extend({}, options, {
				proxy:	_.clone(proxy)
			});

			ProxyVerifier.request('get', checkUrl, requestOptions, function(error) {

				if (error) {
					return cb(null, { ok: false, error: error });
				}

				cb(null, { ok: true });
			});
		},

		anonymityLevel: function(proxy, options, cb) {

			if (_.isUndefined(cb)) {
				cb = cb;
				options = null
			}

			options || (options = {});

			var checkUrl = ProxyVerifier._checkUrl;

			async.parallel({

				withProxy: function(next) {

					var requestOptions = _.extend({}, options, { proxy: proxy });

					ProxyVerifier.request('get', checkUrl, requestOptions, next);
				},

				withoutProxy: function(next) {

					var requestOptions = options;

					ProxyVerifier.request('get', checkUrl, requestOptions, next);
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

			var ipType = proxy.ip_address.indexOf(':') !== -1 ? 'ipv6': 'ipv4';
			var list = countryData[ipType];

			if (_.isUndefined(list)) {
				throw new Error('Country data (' + ipType + ') has not been loaded.');
			}

			var ipToIntFn;

			if (ipType === 'ipv6') {
				ipToIntFn = utils.ipv6ToIntArray;
			} else {
				ipToIntFn = utils.ipv4ToInt;
			}

			var ipInt = ipToIntFn(proxy.ip_address);
			var index = ProxyVerifier.binaryIpSearch(list, ipInt, ipType);

			if (index === -1) {
				// Not found.
				return null;
			}

			return list[index].c;
		}
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

		if (_.isUndefined(cb)) {
			cb = options;
			options = null;
		}

		options = _.defaults(options || {}, { ipv4: true, ipv6: false, cache: true });

		async.parallel({

			ipv4: function(next) {

				if (!options.ipv4) {
					return next();
				}

				if (options.cache && countryData.ipv4) {
					return next(null, countryData.ipv4);
				}

				ProxyVerifier.loadCountryDataFromFile('ipv4', next);
			},

			ipv6: function(next) {

				if (!options.ipv6) {
					return next();
				}

				if (options.cache && countryData.ipv6) {
					return next(null, countryData.ipv6);
				}

				ProxyVerifier.loadCountryDataFromFile('ipv6', next);
			}

		}, function(error, data) {

			if (error) {
				return cb(error);
			}

			if (options.cache) {
				// Cache the data in memory.
				_.each(data, function(_data, key) {
					countryData[key] || (countryData[key] = _data);
				});
			}

			cb(null, data);
		});
	},

	loadCountryDataFromFile: function(ipType, cb) {

		var dataFile = ProxyVerifier._dataDir + '/country-' + ipType + '.json';

		fs.readFile(dataFile, 'utf8', function(error, data) {

			if (error) {
				return cb(error);
			}

			try {
				data = JSON.parse(data);
			} catch (error) {
				return cb(error);
			}

			cb(null, data);
		});
	},

	/*
		Similar to underscore's sortedIndex(), but with a comparator function.

		And a little bit more efficient for our needs.
	*/
	binaryIpSearch: function(ipRangesArray, ip, type) {

		var comparator = type === 'ipv6' ? ProxyVerifier.inRangeIpv6 : ProxyVerifier.inRangeIpv4;
		var low = 0;
		var high = ipRangesArray.length;
		var mid;
		var result;

		while (low < high) {

			mid = Math.floor((low + high) / 2);
			result = comparator(ipRangesArray[mid], ip);

			if (result === 0) {
				return mid;
			}

			if (result === -1) {
				low = mid + 1;
			} else {
				high = mid;
			}
		}

		return -1;
	},

	inRangeIpv4: function(ipRange, ip) {

		var start = ipRange.s;
		var end = ipRange.e || ipRange.s;

		return ip < start ? 1 : ip > end ? -1 : 0;
	},

	inRangeIpv6: function(ipRange, ip) {

		var start = ipRange.s;
		var end = ipRange.e;

		if (!end) {
			return ProxyVerifier.compareIpv6(start, ip);
		}

		if (ProxyVerifier.compareIpv6(start, ip) === 1) {
			return 1;
		}

		if (ProxyVerifier.compareIpv6(end, ip) === -1) {
			return -1;
		}

		return 0;
	},

	compareIpv6: function(ip1, ip2) {

		for (var i = 0; i < 2; i++) {

			if (ip1[i] < ip2[i]) {
				return -1;
			}

			if (ip1[i] > ip2[i]) {
				return 1;
			}
		}

		return 0;
	}
};
