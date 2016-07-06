angular.module("LifeStreamAPI", [ "LifeStreamAlerts" ]);

angular.module("LifeStreamAPI").factory("lsApi", [ "$cookies", "$http", "lsAlerts", "$q", "$window", function($cookies, $http, alerts, $q, $window) {
	var api = this;

	// Possible responses to authorisation token-related failure
	var tokenErrors = [
		"Missing bearer token",
		"Token is invalid",
		"Token has expired"
	];

	// api.httpResolveHandler()
	//
	//   Handles results from $http that are not server errors. Manages alert
	//   message relating to the request, and determines whether a promise
	//   should be resolved or rejected.
	//
	// Parameters:
	//   response - response object from $http
	//   alertOpts - Alert options passed to the function calling this handler:
	//     {
	//       id: /* (string) Unique ID for alerts from this source */,
	//       success: /* (string) (optional) Message to show on success */,
	//       error: /* (string) (optional) Message to show on application error */,
	//       persistent: /* (boolean) (default: false) Whether alert should persist until manually dismissed */
	//     }
	//   resolve - Promise resolve function from caller
	//   reeject - Promise reject function from caller
	api.httpResolveHandler = function(response, alertOpts, resolve, reject) {
		// Alerts resulting from server errors are always persistent, and
		// should be manually removed when the server responds
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
		else if (tokenErrors.indexOf(response.data.error) != -1) {
			// If the request failed due to a bad authorisation token, redirect
			// the user to login page
			$window.location.replace("login?reason=session_timeout&fromUrl=" + encodeURIComponent($window.location));
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
	//   alertOpts - Alert options passed to the function calling this handler:
	//     {
	//       id: /* (string) Unique ID for alerts from this source */,
	//       success: /* (string) (optional) Message to show on success */,
	//       error: /* (string) (optional) Message to show on application error */,
	//       persistent: /* (boolean) (default: false) Whether alert should persist until manually dismissed */
	//     }
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
		});
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
		});
	};

	// api.createUser()
	//
	//   See API documentation for details:
	//     POST api/user
	api.createUser = function(args, alertOpts) {
		var reqArgs = {
			login: args.login,
			password: args.password,
			name: args.name,
			email: args.email,
			isAdmin: args.isAdmin
		};

		return $q(function(resolve, reject) {
			$http.post("api/user", reqArgs).then(
				function(response) {
					api.httpResolveHandler(response, alertOpts, resolve, reject);
				},
				function(response) {
					api.httpRejectHandler("Server error creating user: ", response, alertOpts, resolve, reject);
				}
			);
		});
	};

	// api.updateUser()
	//
	//   See API documentation for details:
	//     PUT api/user/:userid
	api.updateUser = function(userid, args, alertOpts) {
		var reqArgs = {
			password: args.password,
			name: args.name,
			email: args.email,
			isAdmin: args.isAdmin
		};

		return $q(function(resolve, reject) {
			$http.put("api/user/" + userid, reqArgs).then(
				function(response) {
					api.httpResolveHandler(response, alertOpts, resolve, reject);
				},
				function(response) {
					api.httpRejectHandler("Server error updating user: ", response, alertOpts, resolve, reject);
				}
			);
		});
	};

	// api.deleteUser()
	//
	//   See API documentation for details:
	//     DELETE api/user/:userid
	api.deleteUser = function(userid, alertOpts) {
		return $q(function(resolve, reject) {
			$http.delete("api/user/" + userid).then(
				function(response) {
					api.httpResolveHandler(response, alertOpts, resolve, reject);
				},
				function(response) {
					api.httpRejectHandler("Server error deleting user: ", response, alertOpts, resolve, reject);
				}
			);
		});
	};

	// api.loginUser()
	//
	//   See API documentation for details:
	//     POST api/user/login/:login
	api.loginUser = function(login, args, alertOpts) {
		var reqArgs = {
			password: args.password
		};

		return $q(function(resolve, reject) {
			$http.post("api/user/login/" + login, reqArgs).then(
				function(response) {
					if (response.data.success) {
						// Save authorisation token
						$cookies.put("authorization", "Bearer " + response.data.token);
					}
					else {
						// Delete saved authorisation token
						$cookies.remove("authorization");
					}
					api.httpResolveHandler(response, alertOpts, resolve, reject);
				},
				function(response) {
					api.httpRejectHandler("Server error logging in: ", response, alertOpts, resolve, reject);
				}
			);
		});
	};

	// api.refreshToken()
	//
	//   See API documentation for details:
	//     GET api/user/new-token
	api.refreshToken = function(alertOpts) {
		return $q(function(resolve, reject) {
			$http.get("api/user/new-token").then(
				function(response) {
					if (response.data.success) {
						// Save authorisation token
						$cookies.put("authorization", "Bearer " + response.data.token);
					}
					api.httpResolveHandler(response, alertOpts, resolve, reject);
				},
				function(response) {
					api.httpRejectHandler("Server error refreshing authorization token: ", response, alertOpts, resolve, reject);
				}
			);
		});
	};

	// api.findUser()
	//
	//   See API documentation for details:
	//     GET api/user/search
	api.findUser = function(query, alertOpts) {
		return $q(function(resolve, reject) {
			$http.get("api/user/search?q=" + encodeURIComponent(query)).then(
				function(response) {
					api.httpResolveHandler(response, alertOpts, resolve, reject);
				},
				function(response) {
					api.httpRejectHandler("Server error refreshing authorization token: ", response, alertOpts, resolve, reject);
				}
			);
		});
	};

	return api;
}]);
