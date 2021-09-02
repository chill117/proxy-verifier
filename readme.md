# proxy-verifier

![Build Status](https://github.com/chill117/proxy-verifier/actions/workflows/ci.yml/badge.svg)

Check that proxies are working, verify their anonymity level (transparent, anonymous, or elite), lookup their geographic location by IP address, check for other capabilities such as tunneling and available protocols (HTTP/S, SOCKS4/5).

* [Installation](#installation)
* [API](#api)
	* [testAll](#testall)
	* [testProtocol](#testprotocol)
	* [testProtocols](#testprotocols)
	* [testAnonymityLevel](#testanonymitylevel)
	* [test](#test)
* [Contributing](#contributing)
	* [Configure Local Environment](#configure-local-environment)
	* [Tests](#tests)
* [Changelog](#changelog)
* [License](#license)
* [Funding](#funding)


## Installation

Add to your application via `npm`:
```bash
npm install proxy-verifier --save
```
This will install `proxy-verifier` and add it to your application's `package.json` file.


## API

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


### test

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

Before you contribute code, please read through at least some of the source code for the project. I would appreciate it if any pull requests for source code changes follow the coding style of the rest of the project.

Now if you're still interested, you'll need to get your local environment configured.

### Configure Local Environment

#### Step 1: Get the Code

First, you'll need to pull down the code from GitHub:
```
git clone https://github.com/chill117/proxy-verifier.git
```

#### Step 2: Install Dependencies

Second, you'll need to install the project dependencies as well as the dev dependencies. To do this, simply run the following from the directory you created in step 1:
```bash
npm install
```


### Tests

This project includes an automated regression test suite. To run the tests:
```bash
npm test
```


## Changelog

See [changelog.md](https://github.com/chill117/proxy-verifier/blob/master/changelog.md)


## License

This software is [MIT licensed](https://tldrlegal.com/license/mit-license):
> A short, permissive software license. Basically, you can do whatever you want as long as you include the original copyright and license notice in any copy of the software/source.  There are many variations of this license in use.


## Funding

This project is free and open-source. If you would like to show your appreciation by helping to fund the project's continued development and maintenance, you can find available options [here](https://degreesofzero.com/donate.html?project=proxy-verifier).
