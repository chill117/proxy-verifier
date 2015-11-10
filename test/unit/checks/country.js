'use strict';

var _ = require('underscore');
var async = require('async');
var Benchmark = require('benchmark');
var expect = require('chai').expect;

var ProxyVerifier = require('../../../');

describe('check.country(proxy, cb)', function() {

	var proxies = [
		{
			ip_address: '218.49.74.233',
			country: 'kr'
		},
		{
			ip_address: '200.150.97.27',
			country: 'br'
		},
		{
			ip_address: '198.169.246.30',
			country: 'ca'
		},
		{
			ip_address: '68.38.88.142',
			country: 'us'
		},
		{
			ip_address: '201.144.9.102',
			country: 'mx'
		}
	];

	before(function(done) {

		ProxyVerifier.loadCountryData(done);
	});

	it('should be a function', function() {

		expect(ProxyVerifier.check.country).to.be.a('function');
	});

	it('should give the correct country for proxies with IPv4 addresses', function(done) {

		async.each(proxies, function(proxy, next) {

			ProxyVerifier.check.country(proxy, function(error, country) {

				try {
					expect(error).to.equal(null);
					expect(country).to.equal(proxy.country);
				} catch (error) {
					return next(error);
				}

				next();
			});

		}, done);
	});

	describe('performance', function() {

		it('should check the country of many proxies quickly', function(done) {

			this.timeout(30000);

			var i = 0;

			var bench = new Benchmark(function(deferred) {

				ProxyVerifier.check.country(proxies[i] || proxies[i = 0], function() {
					deferred.resolve();
				});
				i++;

			}, {
				async: true,
				defer: true
			});

			bench.on('complete', function(result) {

				try {
					expect(result.target.hz > 500).to.equal(true);
				} catch (error) {
					return done(error);
				}

				done();
			});

			bench.run();
		});
	});
});
