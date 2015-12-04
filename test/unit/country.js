'use strict';

var _ = require('underscore');
var expect = require('chai').expect;

var ProxyVerifier = require('../../');

describe('lookupCountry(proxy)', function() {

	var proxies = require('../fixtures/proxies');

	before(function(done) {

		ProxyVerifier.loadCountryData({ ipv6: true }, done);
	});

	it('should be a function', function() {

		expect(ProxyVerifier.lookupCountry).to.be.a('function');
	});

	_.each(_.keys(proxies), function(ipType) {

		describe(ipType, function() {

			it('should give the correct country', function() {

				_.each(proxies[ipType], function(proxy) {

					var country = ProxyVerifier.lookupCountry(proxy);

					try {
						expect(country).to.equal(proxy.country);
					} catch (error) {
						throw new Error('Wrong country (' + country + ') for ' + proxy.ip_address);
					}
				});
			});
		});
	});
});
