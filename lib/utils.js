'use strict';

var utils = module.exports = {

	ipv4ToInt: function(ip) {

		ip = ip.split(/\./);
		return ((parseInt(ip[0], 10)<<24)>>>0) + ((parseInt(ip[1], 10)<<16)>>>0) + ((parseInt(ip[2], 10)<<8)>>>0) + (parseInt(ip[3], 10)>>>0);
	},

	ipv6ToIntArray: function(ip) {

		ip = ip.split(/:/);

		var l = ip.length - 1;
		var i;

		if (ip[l] === '') {
			ip[l] = 0;
		}

		if (l < 7) {
			ip.length = 8;

			for (i = l; i >= 0 && ip[i] !== ''; i--) {
				ip[7-l+i] = ip[i];
			}
		}

		for (i = 0; i < 8; i++) {
			if (!ip[i]) {
				ip[i]=0;
			} else {
				ip[i] = parseInt(ip[i], 16);
			}
		}

		var r = [];
		for (i = 0; i<4; i++) {
			r.push(((ip[2*i]<<16) + ip[2*i+1])>>>0);
		}

		return r;
	}
};
