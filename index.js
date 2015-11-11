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
	_proxyRelatedHeaderKeywords: ['via', 'proxy'],

	check: {

		protocols: function(proxy, protocols, cb) {

			if (_.isUndefined(cb)) {
				cb = protocols;
				protocols = null
			}

			protocols || (protocols = proxy.protocols);

			if (!_.isArray(protocols)) {
				throw new Error('Invalid "protocols" argument: Array expected.');
			}

			if (!protocols || _.isEmpty(protocols)) {
				throw new Error('Must specify which protocols to test.');
			}

			var tests = _.object(_.map(proxy.protocols, function(protocol) {
				return [protocol, _.bind(ProxyVerifier.checks.protocol, undefined, proxy, protocol)];
			}));

			async.parallel(tests, cb);
		},

		protocol: function(proxy, protocol, cb) {

			if (_.isUndefined(cb)) {
				cb = cb;
				protocol = null
			}

			protocol || (protocol = proxy.protocol);

			if (!protocol) {
				throw new Error('Must specify a protocol to test.');
			}

			ProxyVerifier.request('get', checkUrl, { proxy: proxy }, function(error) {

				if (error) {
					return cb(null, { ok: false, error: error });
				}

				cb(null, { ok: true });
			});
		},

		anonymityLevel: function(proxy, cb) {

			async.parallel({

				withProxy: function(next) {

					ProxyVerifier.request('get', checkUrl, { proxy: proxy }, next);
				},

				withoutProxy: function(next) {

					ProxyVerifier.request('get', checkUrl, next);
				}

			}, function(error, results) {

				if (error) {
					return cb(error);
				}

				var anonymityLevel;
				var withProxy = results.withProxy[0];
				var withoutProxy = results.withoutProxy[0];
				var myIpAddress = withoutProxy.ip;

				// If the requesting host's IP address is in any of the headers, then "transparent".
				if (withProxy.ip === myIpAddress || _.contains(_.values(withProxy.headers), myIpAddress)) {
					anonymityLevel = 'transparent';
				} else {

					var proxyKeywords = ProxyVerifier._proxyRelatedHeaderKeywords;
					var headerKeys = _.keys(withProxy.headers);
					var headerValues = _.values(withProxy.headers);

					var containsProxyKeywords = _.some(proxyKeywords, function(keyword) {
						return _.contains(headerKeys, keyword) ||
								_.contains(headerValues, keyword);
					});

					if (containsProxyKeywords) {
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
				throw new Error('Country data has not been loaded.');
			}

			var ipInt = utils.ipv4ToInt(proxy.ip_address);
			var index = _.sortedIndex(list, { rs: ipInt }, 'rs');

			if (index === -1) {
				// Not found.
				return null;
			}

			if (_.isUndefined(list[--index])) {
				index++;
			}

			return list[index].cc;
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
			var proxyProtocol = options.protocol || proxy.protocol || _.first(proxy.protocols);
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

		var tasks = {};

		if (options.ipv4) {
			tasks.ipv4 = ProxyVerifier.loadIpv4CountryData;
		}

		if (options.ipv6) {
			tasks.ipv6 = ProxyVerifier.loadIpv6CountryData;
		}

		async.parallel(tasks, function(error, data) {

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

	loadIpv4CountryData: function(cb) {

		if (countryData.ipv4) {
			return cb(null, countryData.ipv4);
		}

		var dataFile = ProxyVerifier._dataDir + '/country-ipv4.json';

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

	loadIpv6CountryData: function(cb) {

		if (countryData.ipv6) {
			return cb(null, countryData.ipv6);
		}

		cb(new Error('Not implemented yet.'));
	}
};
