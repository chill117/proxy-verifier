'use strict';

var _ = require('underscore');
var expect = require('chai').expect;

var ProxyVerifier = require('../../');

describe('normalizeProxy(proxy)', function() {

	it('should be a function', function() {
		expect(ProxyVerifier.normalizeProxy).to.be.a('function');
	});

	it('should normalize proxy object as expected', function() {

		var proxies = [
			{
				original: {
					ip_address: '127.0.0.1',
					port: 8000,
					protocols: ['http']
				},
				normalized: {
					ipAddress: '127.0.0.1',
					port: 8000,
					protocols: ['http'],
					auth: null
				}
			},
			{
				original: {
					ip_address: '127.0.0.1',
					port: 8002,
					protocol: 'http'
				},
				normalized: {
					ipAddress: '127.0.0.1',
					port: 8002,
					protocols: ['http'],
					auth: null
				}
			}
		];

		_.each(proxies, function(proxy) {

			var actualNormalized = ProxyVerifier.normalizeProxy(proxy.original);
			var expectedNormalized = proxy.normalized;

			expect(actualNormalized).to.deep.equal(expectedNormalized);
		});
	});
});
