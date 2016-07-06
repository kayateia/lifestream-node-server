angular.module("LifeStreamSession", [ "ngCookies", "LifeStreamAPI" ])
	.factory("lsSession", [ "$cookies", "$http", "lsAlerts", "lsApi", "$window", function($cookies, $http, alerts, api, $window) {
		var session = this;

		// Keep track of information about the logged-in user
		session.user = {};

		session.login = function(login, password, fromUrl) {
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
			var fromUrlStr = fromUrl ? "&fromUrl=" + encodeURIComponent(fromUrl) : "";

			$http.post("api/user/login/" + login, {
				password: password
			}).then(
				function done(response) {
					alerts.remove("login", "persistent");
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
					alerts.add("danger", "Server error logging in: " + response.status + " " + response.statusText, "login", "persistent");
				}
			);
		};

		session.logout = function() {
			$cookies.remove("authorization");
			$window.location.replace("login?reason=logout");
		};

		// session.queryUserInfo()
		//
		//   Queries the server for information about the given user ID, then
		//   stores that info in session.user, which is available to any object
		//   that injects lsSession as a dependency.
		//
		// Parameters:
		//   userid - User ID
		//   callback (optional) - Function will be called once a response has
		//     been received from the server. Signature: callback(err, user)
		session.queryUserInfo = function(userid, callback) {
			api.getUserById(userid, {
				id: "queryUserInfo",
				error: "Couldn't get info for logged-in user: "
			}).then(
				function(data) {
					session.user = {
						id: data.id,
						login: data.login,
						name: data.name,
						email: data.email,
						isAdmin: data.isAdmin
					};
					if (callback) {
						callback(null, session.user);
					}
				},
				function(err) {
					if (callback && err.data) {
						callback(err.data.error);
					}
				}
			);
		};

		session.refresh = function() {
			$http.get("api/user/new-token").then(
				function done(response) {
					if (response.data.success) {
						alerts.remove("refresh", "persistent");
						$cookies.put("authorization", "Bearer " + response.data.token);
					}
					else {
						alerts.add("warning", "Refreshing authorization token failed: " + response.data.error, "refresh", "persistent");
					}
				},
				function fail(response) {
					alerts.add("danger", "Server error refreshing authorization token: " + response.status + " " + response.statusText, "refresh", "persistent");
				}
			);
		};

		return session;
	}]);
