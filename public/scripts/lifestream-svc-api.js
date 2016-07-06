angular.module("LifeStreamAPI", [ "LifeStreamAlerts" ]);

angular.module("LifeStreamAPI").factory("lsApi", [ "$http", "lsAlerts", "$q", function($http, alerts, $q) {
	var api = this;

	// api.httpResolveHandler()
	//
	//   Handles results from $http that are not server errors. Manages alert
	//   message relating to the request, and determines whether a promise
	//   should be resolved or rejected.
	//
	// Parameters:
	//   response - response object from $http
	//   alertOpts - Alert options passed to the function calling this handler
	//   resolve - Promise resolve function from caller
	//   reeject - Promise reject function from caller
	api.httpResolveHandler = function(response, alertOpts, resolve, reject) {
		// Alerts resulting from server errors are always persistent, and should
		// be manually removed when the server responds
		alerts.remove(alertOpts.id, "persistent");

		if (response.data.success) {
			// If a success message was specified, show it
			if (alertOpts.success) {
				alerts.add("success", alertOpts.success, alertOpts.id, alertOpts.persistent ? "persistent" : undefined);
			}
			// Resolve the calling function's promise with data from the
			// server's response
			resolve(response.data);
		}
		else {
			// If an error message was specified, show it
			if (alertOpts.error) {
				alerts.add("danger", alertOpts.error + response.data.error, alertOpts.id, alertOpts.persistent ? "persistent" : undefined);
			}
			// Reject the calling function's promise with the full response
			// object, so the function awaiting that promise can distinguish
			// between a server error and an application error
			reject(response);
		}
	};

	// api.httpRejectHandler()
	//
	//   Handles server errors from $http. Creates a persistent alert relating
	//   to the server error, and rejets the promise on behalf of the caller.
	//
	// Parameters:
	//   response - response object from $http
	//   alertOpts - Alert options passed to the function calling this handler
	//   resolve - Promise resolve function from caller
	//   reeject - Promise reject function from caller
	api.httpRejectHandler = function(message, response, alertOpts, resolve, reject) {
		// Server errors should always trigger a persistent alert
		alerts.add("danger", message + response.status + " " + response.statusText, alertOpts.id, "persistent")

		// Reject the calling function's promise with the full response
		// object, so the function awaiting that promise can distinguish
		// between a server error and an application error
		reject(response);
	};

	// api.getUserById()
	//
	//   See API documentation for details:
	//     GET api/user/:userid
	api.getUserById = function(userid, alertOpts) {
		return $q(function(resolve, reject) {
			$http.get("api/user/" + userid).then(
				function(response) {
					api.httpResolveHandler(response, alertOpts, resolve, reject);
				},
				function(response) {
					api.httpRejectHandler("Server error getting user info: ", response, alertOpts, resolve, reject);
				}
			);
		})
	};

	// api.getUserByLogin()
	//
	//   See API documentation for details:
	//     GET api/user/login/:loginid
	api.getUserByLogin = function(login, alertOpts) {
		return $q(function(resolve, reject) {
			$http.get("api/user/login/" + login).then(
				function(response) {
					api.httpResolveHandler(response, alertOpts, resolve, reject);
				},
				function(response) {
					api.httpRejectHandler("Server error getting user info: ", response, alertOpts, resolve, reject);
				}
			);
		})
	};

	return api;
}]);
