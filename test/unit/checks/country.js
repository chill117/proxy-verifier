'use strict';

var expect = require('chai').expect;

var ProxyVerifier = require('../../../');

describe('check.country(proxy, cb)', function() {

	it('should be a function', function() {

		expect(ProxyVerifier.check.country).to.be.a('function');
	});
});
