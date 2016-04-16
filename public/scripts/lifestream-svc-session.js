angular.module("LifeStreamSession", [ "ngCookies" ])
	.factory("lsSession", [ "$cookies", "$http", "$window", function($cookies, $http, $window) {
		var session = this;

		session.login = function(username, password) {
			$http.post("/api/user/login", {
				login: username,
				password: password
			}).then(
				function done(response) {
					if (response.data.success) {
						$cookies.put("authorization", "Bearer " + response.data.token);
						$window.location.replace("/login?reason=successful_login");
					}
					else {
						$cookies.remove("authorization");
						$window.location.replace("/login?reason=failed_login&detail=" + encodeURIComponent(response.data.error));
					}
				},
				function fail(response) {
					$window.alert("login failed: " + JSON.stringify(response.data));
				}
			);
		};

		session.logout = function() {
			$cookies.remove("authorization");
			$window.location.replace("/login?reason=logout");
		};

		session.refresh = function() {
			$http.get("/api/user/new-token").then(
				function done(response) {
					if (response.data.success) {
						$cookies.put("authorization", "Bearer " + response.data.token);
						$window.alert("new-token request successful; new cookie set");
					}
				},
				function fail(response) {
					$window.alert("new-token request failed: " + JSON.stringify(response.data));
				}
			);
		};

		return session;
	}]);
