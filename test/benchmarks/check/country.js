'use strict';

var _ = require('underscore');
var Benchmark = require('benchmark');

var ProxyVerifier = require('../../../');

describe('benchmark: check.country', function() {

	var proxies = require('../../fixtures/proxies');

	before(function(done) {

		ProxyVerifier.loadCountryData({ ipv6: true }, done);
	});

	var minHz = {
		ipv4: 500000,
		ipv6: 50000
	};

	_.each(_.keys(proxies), function(ipType) {

		describe(ipType, function() {

			it('should run at least ' + minHz[ipType] + ' ops/second', function(done) {

				this.timeout(15000);

				var i = 0;

				var bench = new Benchmark(function() {
					var proxy = proxies[ipType][i++] || proxies[ipType][i = 0];
					ProxyVerifier.check.country(proxy);
				});

				bench.on('complete', function(result) {

					if (result.target.error) {
						return done(result.target.error);
					}

					console.log(result.target.toString());

					if (!(result.target.hz >= minHz[ipType])) {
						return done(new Error('Expected at least ' + minHz[ipType] + ' ops/second'))
					}

					done();
				});

				bench.run();
			});
		});
	});
});
