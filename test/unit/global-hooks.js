'use strict'

var ProxyVerifier = require('../../');

console.log('unit/global-hooks')

after(function(done) {
	ProxyVerifier.stopProxyCheckService(done);
});
