'use strict';

var expect = require('chai').expect;

var ProxyVerifier = require('../../../');

describe('check.anonymityLevel(proxy, cb)', function() {

	it('should be a function', function() {

		expect(ProxyVerifier.check.anonymityLevel).to.be.a('function');
	});
});
