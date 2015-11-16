'use strict';

var _ = require('underscore');
var expect = require('chai').expect;

var ProxyVerifier = require('../../../');

describe('check.country(proxy)', function() {

	var proxies = {
		ipv4: [
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
		]
	};

	before(function(done) {

		ProxyVerifier.loadCountryData(done);
	});

	it('should be a function', function() {

		expect(ProxyVerifier.check.country).to.be.a('function');
	});

	it('should give the correct country for proxies with IPv4 addresses', function() {

		_.each(proxies.ipv4, function(proxy) {

			var thrownError;

			try {
				var country = ProxyVerifier.check.country(proxy);
			} catch (error) {
				thrownError = error;
			}

			expect(thrownError).to.equal(undefined);
			expect(country).to.equal(proxy.country);
		});
	});
});
