'use strict';

var Benchmark = require('benchmark');

var ProxyVerifier = require('../../../');

describe('benchmark: check.country', function() {

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

	var minHz = 100000;

	it('should run at least ' + minHz + ' ops/second', function(done) {

		this.timeout(15000);

		var i = 0;

		var bench = new Benchmark(function() {
			var proxy = proxies.ipv4[i++] || proxies.ipv4[i = 0];
			ProxyVerifier.check.country(proxy);
		});

		bench.on('complete', function(result) {

			if (result.target.error) {
				return done(result.target.error);
			}

			if (!(result.target.hz >= minHz)) {
				return done(new Error('Expected at least ' + minHz + ' ops/second'))
			}

			done();
		});

		bench.run();
	});
});
