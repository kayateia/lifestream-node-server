angular.module("LifeStreamKeepAlive", [ "LifeStreamSession" ])
	.factory("lsKeepAlive", [ "lsSession", "$interval", function(session, $interval) {
		var keepalive = this;

		keepalive.interval = undefined; // promise returned by $interval()
		keepalive.pinged = false; // has there been user activity recently?

		keepalive.begin = function() {
			if (keepalive.interval == undefined) {
				keepalive.interval = $interval(keepalive.pingCheck, 3000);
			}
		}

		keepalive.end = function() {
			if (keepalive.interval != undefined) {
				keepalive.interval.cancel();
				keepalive.interval = undefined;
			}
		}

		keepalive.ping = function() {
			keepalive.pinged = true;
		}

		keepalive.pingCheck = function() {
			if (keepalive.pinged) {
				alert('User activity was present; refreshing session');
				session.refresh();
				keepalive.pinged = false;
			}
		}

		return keepalive;
	}]);
