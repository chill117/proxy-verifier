'use strict';

var async = require('async');
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

		var targetNumProxies = 500000;
		var manyProxies = [];

		before(function() {

			while (manyProxies.length < targetNumProxies) {
				manyProxies.push.apply(manyProxies, proxies);
			}
		});

		it('should check the country of many proxies quickly', function(done) {

			var timeStarted = (new Date).getMilliseconds();
			var timeCompleted;

			async.each(manyProxies, ProxyVerifier.check.country, function(error) {

				if (error) {
					return done(error);
				}

				timeCompleted = (new Date).getMilliseconds();

				try {
					expect(timeCompleted - timeStarted < 1500).to.equal(true);
				} catch (error) {
					return done(error);
				}

				done();
			});
		});
	});
});
