'use strict';

var _ = require('underscore');
var expect = require('chai').expect;

var ProxyVerifier = require('../../../');

describe('check.protocols(proxy[, options], cb)', function() {

	it('should be a function', function() {

		expect(ProxyVerifier.check.protocols).to.be.a('function');
	});

	it('should call check.protocol(proxy[, option], cb) for each protocol in proxy.protocols', function() {

		var originalCheckProtocolFn = ProxyVerifier.check.protocol;
		var testOptions = { some: 'option' };
		var checked = {};

		ProxyVerifier.check.protocol = function(proxy, options) {

			// Options should be passed through.
			expect(options).to.deep.equal(testOptions);

			// Should have protocol attribute.
			expect(proxy.protocol).to.not.equal(undefined);

			checked[proxy.protocol] = true;
		};

		var proxy = {
			ip_address: '127.0.0.1',
			port: 5050,
			protocols: ['https', 'http', 'socks4']
		};

		ProxyVerifier.check.protocols(proxy, testOptions, function() {});

		expect(_.keys(checked)).to.have.length(proxy.protocols.length);

		var allProtocolsChecked = _.every(proxy.protocols, function(protocol) {
			return checked[protocol];
		});

		expect(allProtocolsChecked).to.equal(true);

		ProxyVerifier.check.protocol = originalCheckProtocolFn;
	});
});
