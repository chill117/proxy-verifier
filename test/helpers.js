'use strict';

var _ = require('underscore');
var express = require('express');
var http = require('http');
var https = require('https');
var httpProxy = require('http-proxy');
var net = require('net');
var url = require('url');

var ssl = require('./ssl');

module.exports = {

	createAppServer: function(port, host) {

		var app = express();

		app.get('/check', function(req, res) {

			var ipAddress = req.connection.remoteAddress;

			res.status(200).json({
				ipAddress: ipAddress,
				headers: req.headers
			});
		});

		app.http = http.createServer(app).listen(port, host);
		app.https = https.createServer({ cert: ssl.cert, key: ssl.key }, app).listen(port + 1, host);

		return app;
	},

	createProxyServer: function(port, host, options) {

		options || (options = {});
		options = _.defaults(options, { tunnel: true });
		options.localAddress = host;

		if (options.proxyAuth) {
			options.auth = options.proxyAuth;
		}

		var proxy = httpProxy.createProxyServer(_.omit(options, 'tunnel'));

		proxy.http = http.createServer(function(req, res) {

			if (options.proxyAuth && !reqIsAuthenticated(req, options.proxyAuth)) {
				res.writeHead(407);
				return res.end();
			}

			var target = _.omit(url.parse(req.url), 'path');

			proxy.web(req, res, {
				target: target
			});

		}).listen(port, host);

		proxy.https = https.createServer({
			cert: ssl.cert,
			key: ssl.key
		}, function(req, res) {

			if (options.proxyAuth && !reqIsAuthenticated(req, options.proxyAuth)) {
				res.writeHead(407);
				return res.end();
			}

			var target = _.omit(url.parse(req.url), 'path');

			target.https = true;
			target.rejectUnauthorized = false;

			proxy.web(req, res, {
				target: target
			});

		}).listen(port + 1, host);

		if (options.tunnel) {
			var onConnect = _.bind(setupTunnel, undefined, host);
			proxy.http.on('connect', onConnect);
			proxy.https.on('connect', onConnect);
		} else {
			proxy.http.on('connect', methodNotAllowed);
			proxy.https.on('connect', methodNotAllowed);
		}

		return proxy;
	}
};

function methodNotAllowed(req, client, head) {
	client.write('HTTP/' + req.httpVersion + ' 405 Method Not Allowed\r\n\r\n');
	client.end();
}

function setupTunnel(localAddress, req, client, head) {

	var reqUri = url.parse(req.url.indexOf('://') !== -1 ? req.url : 'http://' + req.url);

	var server = net.connect({
		host: reqUri.hostname,
		port: reqUri.port,
		localAddress: localAddress
	}, function() {
		client.write(
			'HTTP/1.1 200 Connection Established\r\n' +
			'Proxy-agent: Node.js-Proxy\r\n' +
			'\r\n'
		);
		server.write(head);
		server.pipe(client);
		client.pipe(server);
	});
}

function reqIsAuthenticated(req, auth) {

	var authHeader = req.headers['proxy-authorization'] || req.headers['authorization'] || null;

	if (!authHeader) {
		return false;
	}

	var parts = (new Buffer(authHeader.substr('Basic '.length), 'base64')).toString().split(':');
	return parts[0] === auth.user && parts[1] === auth.pass;
}
