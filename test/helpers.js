'use strict';

var _ = require('underscore');
var express = require('express');
var fs = require('fs');
var http = require('http');
var https = require('https');
var httpProxy = require('http-proxy');
var net = require('net');
var url = require('url');

var ssl = require('./ssl');

module.exports = {

	createAppServer: function(port, host) {

		var app = express();

		app.get('/check', function(req, res, next) {

			var ip_address = req.connection.remoteAddress;

			res.status(200).json({
				ip_address: ip_address,
				headers: req.headers
			});
		});

		app.http = http.createServer(app).listen(port, host);
		app.https = https.createServer({ cert: ssl.cert, key: ssl.key }, app).listen(port + 1, host);

		return app;
	},

	createProxyServer: function(port, host, options) {

		options || (options = {});

		options.localAddress = host;

		var proxy = httpProxy.createProxyServer(options);

		proxy.http = http.createServer(function(req, res) {

			proxy.web(req, res, {
				target: _.omit(url.parse(req.url), 'path')
			});

		}).listen(port, host);

		proxy.https = https.createServer({
			cert: ssl.cert,
			key: ssl.key
		}, function(req, res) {

			var target = _.omit(url.parse(req.url), 'path');

			target.https = true;
			target.rejectUnauthorized = false;

			proxy.web(req, res, {
				target: target
			});

		}).listen(port + 1, host);

		function connectTunnel(req, cltSocket, head) {

			// Bind local address of proxy server.
			var srvSocket = new net.Socket({
				handle: net._createServerHandle(host)
			});

			// Connect to an origin server.
			var srvUrl = url.parse('http://' + req.url);

			srvSocket.connect(srvUrl.port, srvUrl.hostname, function() {
				cltSocket.write(
					'HTTP/1.1 200 Connection Established\r\n' +
					'Proxy-agent: Node.js-Proxy\r\n' +
					'\r\n'
				);
				srvSocket.write(head);
				srvSocket.pipe(cltSocket);
				cltSocket.pipe(srvSocket);
			});
		}

		// Tunneling.
		proxy.http.on('connect', connectTunnel);
		proxy.https.on('connect', connectTunnel);

		return proxy;
	}
};
