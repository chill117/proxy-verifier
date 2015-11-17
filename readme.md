# proxy-verifier

Check that proxies are working, verify their anonymity level and country.

[![Build Status](https://travis-ci.org/chill117/proxy-verifier.svg?branch=master)](https://travis-ci.org/chill117/proxy-verifier) [![Status of Dependencies](https://david-dm.org/chill117/proxy-verifier.svg)](https://david-dm.org/chill117/proxy-verifier)


## Installation

Add to your application via `npm`:
```
npm install proxy-verifier --save
```
This will install `proxy-verifier` and add it to your application's `package.json` file.


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
