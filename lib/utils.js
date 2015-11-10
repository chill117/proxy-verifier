'use strict';

var utils = module.exports = {

	ipv4ToInt: function(ip) {

		ip = ip.split(/\./);
		return ((parseInt(ip[0], 10)<<24)>>>0) + ((parseInt(ip[1], 10)<<16)>>>0) + ((parseInt(ip[2], 10)<<8)>>>0) + (parseInt(ip[3], 10)>>>0);
	},

	ipv4CidrToRange: function(cidr) {

		var start = cidr.substr(cidr, cidr.indexOf('/'));
		var end = start;
		var off = (1<<(32-parseInt(cidr.substr(cidr.indexOf('/')+1))))-1;
		var sub = start.split('.').map(function(a) {
			return parseInt(a);
		});

		// An IPv4 address is just an UInt32.
		var buf = new ArrayBuffer(4);// 4 octets
		var i32 = new Uint32Array(buf);

		// Get the UInt32, and add the bit difference.
		i32[0] = (sub[0]<<24) + (sub[1]<<16) + (sub[2]<<8) + (sub[3]) + off;

		// Recombine into an IPv4 string.
		var end = Array.apply([], new Uint8Array(buf)).reverse().join('.');

		return { start: start, end: end };
	}
};
