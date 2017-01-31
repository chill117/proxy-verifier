# proxy-verifier

[![Build Status](https://travis-ci.org/chill117/proxy-verifier.svg?branch=master)](https://travis-ci.org/chill117/proxy-verifier) [![Status of Dependencies](https://david-dm.org/chill117/proxy-verifier.svg)](https://david-dm.org/chill117/proxy-verifier)

Checks proxies for the following:
* That they work as a proxy
* Which protocol(s) they support (HTTP, HTTPS, SOCKS4, and/or SOCKS5)
* Level of anonymity (transparent, anonymous, or elite)
* Tunneling support (HTTPS over HTTP)


## Installation

Add to your application via `npm`:
```
npm install proxy-verifier --save
```
This will install `proxy-verifier` and add it to your application's `package.json` file.


## How to Use

* [testAll](#testall)
* [testProtocol](#testprotocol)
* [testProtocols](#testprotocols)
* [testAnonymityLevel](#testanonymitylevel)
* [testTunnel](#testtunnel)
* [test](#test)


### testAll

`testAll(proxy[, options], cb)`

Runs all test methods for the given proxy. The `options` argument is passed through to every test method.

Usage:
```js
var ProxyVerifier = require('proxy-verifier');

var proxy = {
	ipAddress: '127.0.0.1',
	port: 8888,
	protocol: 'http'
};

ProxyVerifier.testAll(proxy, function(error, result) {

	if (error) {
		// Some unusual error occurred.
	} else {
		// The result object will contain success/error information.
	}
});
```

Sample `result`:
```js
{
	anonymityLevel: 'elite',
	protocols: {
		http: {
			ok: true
		}
	},
	tunnel: {
		ok: true
	}
}
```


### testProtocol

`testProtocol(proxy[, options], cb)`

Check that the proxy works with the specified protocol. The `options` argument is passed through to the `request()` method which uses [request](https://github.com/request/request).

Usage:
```js
var ProxyVerifier = require('proxy-verifier');

var proxy = {
	ipAddress: '127.0.0.1',
	port: 8080,
	protocol: 'http'
};

ProxyVerifier.testProtocol(proxy, function(error, result) {

	if (error) {
		// Some unusual error occurred.
	} else {
		// The result object will contain success/error information.
	}
});
```

Sample `result` when the proxy is working:
```js
{
	ok: true
}
```

Sample `result` when the proxy is not working:
```js
{
	ok: false,
	error: {
		message: 'socket hang up',
		code: 'ECONNRESET'
	}
}
```


### testProtocols

`testProtocols(proxy[, options], cb)`

Check that the proxy works with the specified protocols. The `options` argument is passed through to the `request()` method which uses [request](https://github.com/request/request).

Usage:
```js
var ProxyVerifier = require('proxy-verifier');

var proxy = {
	ipAddress: '127.0.0.1',
	port: 8080,
	protocols: ['http', 'https']
};

ProxyVerifier.testProtocols(proxy, function(error, results) {

	if (error) {
		// Some unusual error occurred.
	} else {
		// The results object contains a result object for each protocol.
	}
});
```

Sample `results` when the proxy is working for all its protocols:
```js
{
	http: {
		ok: true
	},
	https: {
		ok: true
	}
}
```

Sample `results` when the proxy is not working for any of the protocols:
```js
{
	http: {
		ok: false,
		error: {
			message: 'socket hang up',
			code: 'ECONNRESET'
		}
	},
	https: {
		ok: false,
		error: {
			message: 'socket hang up',
			code: 'ECONNRESET'
		}
	}
}
```


### testAnonymityLevel

`testAnonymityLevel(proxy[, options], cb)`

Check the anonymity level of the proxy. The `options` argument is passed through to the `request()` method which uses [request](https://github.com/request/request).

Usage:
```js
var ProxyVerifier = require('proxy-verifier');

var proxy = {
	ipAddress: '127.0.0.1',
	port: 8080,
	protocol: 'http'
};

ProxyVerifier.testAnonymityLevel(proxy, function(error, anonymityLevel) {

	if (error) {
		// Some unusual error occurred.
	} else {
		// anonymityLevel will be a string equal to "transparent", "anonymous", or "elite".
	}
});
```

Anonymity levels explained:
* __transparent__ - The proxy does not hide the requester's IP address.
* __anonymous__ - The proxy hides the requester's IP address, but adds headers to the forwarded request that make it clear that the request was made using a proxy.
* __elite__ - The proxy hides the requester's IP address and does not add any proxy-related headers to the request.


### testTunnel

`testTunnel(proxy[, options], cb)`

Check to see if the proxy supports [HTTP tunneling](https://en.wikipedia.org/wiki/HTTP_tunnel). The `options` argument is passed through to the `request()` method which uses [request](https://github.com/request/request).

Usage:
```js
var ProxyVerifier = require('proxy-verifier');

var proxy = {
	ipAddress: '127.0.0.1',
	port: 8888,
	protocol: 'http'
};

ProxyVerifier.testTunnel(proxy, function(error, result) {

	if (error) {
		// Some unusual error occurred.
	} else {
		// The result object will contain success/error information.
	}
});
```

Sample `result` when the proxy supports tunneling:
```js
{
	ok: true
}
```

Sample `result` when the proxy does not support tunneling:
```js
{
	ok: false,
	error: {
		message: 'socket hang up',
		code: 'ECONNRESET'
	}
}
```


### Test

Use this method to create your custom tests. Example usage:
```js
ProxyVerifier.test(proxy, {
    testUrl: 'https://www.google.com/?q=test',
    testFn: function(data, status, headers) {

        // Check the response data, status, and headers.

        // Throw an error if the test failed.
        throw new Error('Test failed!');

        // Do nothing if the test passed.
    }
}, function(error, results) {
    // Do something with error or results.
});
```


## Contributing

There are a number of ways you can contribute:

* **Improve or correct the documentation** - All the documentation is in this `readme.md` file. If you see a mistake, or think something should be clarified or expanded upon, please [submit a pull request](https://github.com/chill117/proxy-verifier/pulls/new)
* **Report a bug** - Please review [existing issues](https://github.com/chill117/proxy-verifier/issues) before submitting a new one; to avoid duplicates. If you can't find an issue that relates to the bug you've found, please [create a new one](https://github.com/chill117/proxy-verifier/issues).
* **Request a feature** - Again, please review the [existing issues](https://github.com/chill117/proxy-verifier/issues) before posting a feature request. If you can't find an existing one that covers your feature idea, please [create a new one](https://github.com/chill117/proxy-verifier/issues).
* **Fix a bug** - Have a look at the [existing issues](https://github.com/chill117/proxy-verifier/issues) for the project. If there's a bug in there that you'd like to tackle, please feel free to do so. I would ask that when fixing a bug, that you first create a failing test that proves the bug. Then to fix the bug, make the test pass. This should hopefully ensure that the bug never creeps into the project again. After you've done all that, you can [submit a pull request](https://github.com/chill117/proxy-verifier/pulls/new) with your changes.


## Tests

To run all tests:
```
grunt test
```

To run only unit tests:
```
grunt test:unit
```

To run only code-style checks:
```
grunt test:code-style
```


## Changelog

* v0.4.0:
  * `test()` method to allow for custom tests.
  * Deprecated `lookupCountry()`, `loadCountryData()`, and `loadCountryDataSync()`. These will be removed in a future release. Use [geoip-native-lite](https://github.com/chill117/geoip-native-lite) if you need to check the geo-location for your proxies.
* v0.3.0:
  * Performance improvements for `testAll()`.
  * Changed `proxy.ip_address` to `proxy.ipAddress`
  * Added `normalizeProxy(proxy)` method.
* v0.2.0:
  * Renamed `all` to `testAll`. `all` method now prints a deprecated warning.
  * Renamed `protocol` to `testProtocol`. `protocol` method now prints a deprecated warning.
  * Renamed `protocols` to `testProtocols`. `protocols` method now prints a deprecated warning.
  * Renamed `anonymityLevel` to `testAnonymityLevel`. `anonymityLevel` method now prints a deprecated warning.
  * Renamed `tunnel` to `testTunnel`. `tunnel` method now prints a deprecated warning.
  * Renamed `country` to `lookupCountry`. `country` method now prints a deprecated warning.
