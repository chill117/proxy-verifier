'use strict';

var expect = require('chai').expect;

var ProxyVerifier = require('../../../');

describe('check.protocols(proxy[, protocols], cb)', function() {

	it('should be a function', function() {

		expect(ProxyVerifier.check.protocols).to.be.a('function');
	});
});
