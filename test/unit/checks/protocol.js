'use strict';

var expect = require('chai').expect;

var ProxyVerifier = require('../../../');

describe('check.protocol(proxy[, protocol], cb)', function() {

	it('should be a function', function() {

		expect(ProxyVerifier.check.protocol).to.be.a('function');
	});
});
