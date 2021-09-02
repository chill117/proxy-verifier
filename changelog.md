# Changelog

* v0.5.0:
  * Use ifconfig.me as default proxy check service
* v0.4.4:
  * Upgraded dependencies
* v0.4.3:
  * Upgraded dependencies
* v0.4.2:
  * Upgraded dependencies
* v0.4.1:
  * Upgraded dependencies
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
