angular.module("LifeStreamSession", [ "ngCookies" ])
	.factory("lsSession", [ "$cookies", "$http", "lsAlerts", "$window", function($cookies, $http, alerts, $window) {
		var session = this;

		// Keep track of information about the logged-in user
		session.user = {};

		session.login = function(username, password, fromUrl) {
			// If the user arrived at the login page via an expired session
			// when trying to access another page, the login page needs to be
			// aware of the URL the user was trying to reach.
			//
			// routes/index.js provides that information when redirecting to
			// the login page, but this function does one final redirect to the
			// login page after the user logs in successfully.
			//
			// This function is therefore responsible for informing the final
			// instance of the login page where the user intended to go before
			// reaching the login page.
			var fromUrlStr = fromUrl ? "&fromUrl=." + encodeURIComponent(fromUrl) : "";

			$http.post("api/user/login/" + username, {
				password: password
			}).then(
				function done(response) {
					alerts.remove("login", "session");
					if (response.data.success) {
						$cookies.put("authorization", "Bearer " + response.data.token);
						$window.location.replace("login?reason=successful_login" + fromUrlStr);
					}
					else {
						$cookies.remove("authorization");
						$window.location.replace("login?reason=failed_login" + fromUrlStr + "&detail=" + encodeURIComponent(response.data.error));
					}
				},
				function fail(response) {
					alerts.add("danger", "Server error logging in: " + response.status + " " + response.statusText, "login", "session");
				}
			);
		};

		session.logout = function() {
			$cookies.remove("authorization");
			$window.location.replace("login?reason=logout");
		};

		session.queryUserInfo = function(username, callback) {
			$http.get("api/user/info/" + username)
				.then(
					function done(response) {
						if (response.data.success) {
							alerts.remove("queryUserInfo", "session");
							session.user = {
								id: response.data.id,
								login: response.data.login,
								name: response.data.name,
								email: response.data.email,
								isAdmin: response.data.isadmin
							};
							if (callback) {
								callback(session.user);
							}
						}
						else {
							alerts.add("warning", "Querying user info failed: " + response.data.error, "queryUserInfo", "session");
						}
					},
					function fail(response) {
						alerts.add("danger", "Server error querying user info: " + response.status + " " + response.statusText, "queryUserInfo", "session");
					}
				);
		};

		session.refresh = function() {
			$http.get("api/user/new-token").then(
				function done(response) {
					if (response.data.success) {
						alerts.remove("refresh", "session");
						$cookies.put("authorization", "Bearer " + response.data.token);
					}
					else {
						alerts.add("warning", "Refreshing authorization token failed: " + response.data.error, "refresh", "session");
					}
				},
				function fail(response) {
					alerts.add("danger", "Server error refreshing authorization token: " + response.status + " " + response.statusText, "refresh", "session");
				}
			);
		};

		return session;
	}]);
