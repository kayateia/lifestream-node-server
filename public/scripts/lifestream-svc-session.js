angular.module("LifeStreamSession", [ "ngCookies" ])
	.factory("lsSession", [ "$cookies", "$http", "$window", function($cookies, $http, $window) {
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
					$window.alert("login failed: " + response.status + " " + response.statusText);
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
							$window.alert("Querying user info failed: " + JSON.stringify(response.data));
						}
					},
					function fail(response) {
						$window.alert("Querying user info failed: " + response.status + " " + response.statusText);
					}
				);
		};

		session.refresh = function() {
			$http.get("api/user/new-token").then(
				function done(response) {
					if (response.data.success) {
						$cookies.put("authorization", "Bearer " + response.data.token);
					}
				},
				function fail(response) {
					$window.alert("new-token request failed: " + response.status + " " + response.statusText);
				}
			);
		};

		return session;
	}]);
