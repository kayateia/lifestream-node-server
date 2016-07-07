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
				alerts.add("success", alertOpts.success, alertOpts.persistent ? alertOpts.id : undefined, alertOpts.persistent ? "persistent" : undefined);
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
				alerts.add("danger", alertOpts.error + response.data.error, alertOpts.persistent ? alertOpts.id : undefined, alertOpts.persistent ? "persistent" : undefined);
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
	api.loginUser = function(login, password, alertOpts) {
		return $q(function(resolve, reject) {
			$http.post("api/user/login/" + login, {
				password: password
			}).then(
				function(response) {
					if (response.data.success) {
						// Save authorisation token
						$cookies.put("authorization", "Bearer " + response.data.token);
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
					api.httpRejectHandler("Server error searching users: ", response, alertOpts, resolve, reject);
				}
			);
		});
	};

	// api.getStreamsByImage()
	//
	//   See API documentation for details:
	//     GET api/image/:imageid/streams
	api.getStreamsByImage = function(imageid, alertOpts) {
		return $q(function(resolve, reject) {
			$http.get("api/image/" + imageid + "/streams").then(
				function(response) {
					api.httpResolveHandler(response, alertOpts, resolve, reject);
				},
				function(response) {
					api.httpRejectHandler("Server error getting streams containing image: ", response, alertOpts, resolve, reject);
				}
			);
		});
	};

	// api.addImageToStream()
	//
	//   See API documentation for details:
	//     POST api/image/:imageid/streams
	api.addImageToStream = function(imageid, streamid, alertOpts) {
		return $q(function(resolve, reject) {
			$http.post("api/image/" + imageid + "/streams", {
				streamid: streamid
			}).then(
				function(response) {
					api.httpResolveHandler(response, alertOpts, resolve, reject);
				},
				function(response) {
					api.httpRejectHandler("Server error associating image with stream: ", response, alertOpts, resolve, reject);
				}
			);
		});
	};

	// api.removeImageFromStream()
	//
	//   See API documentation for details:
	//     POST api/image/:imageid/streams
	api.removeImageFromStream = function(imageid, streamid, alertOpts) {
		return $q(function(resolve, reject) {
			$http.delete("api/image/" + imageid + "/streams?streamid=" + streamid).then(
				function(response) {
					api.httpResolveHandler(response, alertOpts, resolve, reject);
				},
				function(response) {
					api.httpRejectHandler("Server error dissociating image from stream: ", response, alertOpts, resolve, reject);
				}
			);
		});
	};

	// api.setImageComment()
	//
	//   See API documentation for details:
	//     PUT api/image/:imageid/comment
	api.setImageComment = function(imageid, comment, alertOpts) {
		return $q(function(resolve, reject) {
			$http.put("api/image/" + imageid + "/comment", {
				comment: comment
			}).then(
				function(response) {
					api.httpResolveHandler(response, alertOpts, resolve, reject);
				},
				function(response) {
					api.httpRejectHandler("Server error setting image comment: ", response, alertOpts, resolve, reject);
				}
			);
		});
	};

	// api.getStreams()
	//
	//   See API documentation for details:
	//     GET api/stream/list
	api.getStreams = function(alertOpts) {
		return $q(function(resolve, reject) {
			$http.get("api/stream/list").then(
				function(response) {
					api.httpResolveHandler(response, alertOpts, resolve, reject);
				},
				function(response) {
					api.httpRejectHandler("Server error getting streams list: ", response, alertOpts, resolve, reject);
				}
			);
		});
	};

	// api.getStreamsByUser()
	//
	//   See API documentation for details:
	//     GET api/stream/list?userid=<userid>
	api.getStreamsByUser = function(userid, alertOpts) {
		return $q(function(resolve, reject) {
			$http.get("api/stream/list?userid=" + userid).then(
				function(response) {
					api.httpResolveHandler(response, alertOpts, resolve, reject);
				},
				function(response) {
					api.httpRejectHandler("Server error getting streams belonging to user: ", response, alertOpts, resolve, reject);
				}
			);
		});
	};

	// api.getStreamInfo()
	//
	//   See API documentation for details:
	//     GET api/stream/:streamid
	api.getStreamInfo = function(streamid, alertOpts) {
		return $q(function(resolve, reject) {
			$http.get("api/stream/" + streamid).then(
				function(response) {
					api.httpResolveHandler(response, alertOpts, resolve, reject);
				},
				function(response) {
					api.httpRejectHandler("Server error getting stream info: ", response, alertOpts, resolve, reject);
				}
			);
		});
	};

	// api.getStreamContents()
	//
	//   See API documentation for details:
	//     GET api/stream/:streamid/contents
	api.getStreamContents = function(streamid, args, alertOpts) {
		var reqArgs = {
			count: args.count,
			olderThan: args.olderThan,
			olderThanId: args.olderThanId
		};

		return $q(function(resolve, reject) {
			$http.get("api/stream/" + streamid + "/contents?" +
				(reqArgs.count ? "&count=" + reqArgs.count : "") +
				(reqArgs.olderThan ? "&olderThan=" + reqArgs.olderThan : "") +
				(reqArgs.olderThanId ? "&olderThanId=" + reqArgs.olderThanId : "")
			).then(
				function(response) {
					api.httpResolveHandler(response, alertOpts, resolve, reject);
				},
				function(response) {
					api.httpRejectHandler("Server error getting stream contents: ", response, alertOpts, resolve, reject);
				}
			);
		});
	};

	// api.findStream()
	//
	//   See API documentation for details:
	//     GET api/stream/search
	api.findStream = function(query, alertOpts) {
		return $q(function(resolve, reject) {
			$http.get("api/stream/search?q=" + encodeURIComponent(query)).then(
				function(response) {
					api.httpResolveHandler(response, alertOpts, resolve, reject);
				},
				function(response) {
					api.httpRejectHandler("Server error searching streams: ", response, alertOpts, resolve, reject);
				}
			);
		});
	};

	// api.createStream()
	//
	//   See API documentation for details:
	//     POST api/stream
	api.createStream = function(args, alertOpts) {
		var reqArgs = {
			userid: args.userid,
			name: args.name,
			permission: args.permission
		};

		return $q(function(resolve, reject) {
			$http.post("api/stream", reqArgs).then(
				function(response) {
					api.httpResolveHandler(response, alertOpts, resolve, reject);
				},
				function(response) {
					api.httpRejectHandler("Server error creating stream: ", response, alertOpts, resolve, reject);
				}
			);
		});
	};

	// api.updateStream()
	//
	//   See API documentation for details:
	//     PUT api/stream/:streamid
	api.updateStream = function(streamid, args, alertOpts) {
		var reqArgs = {
			name: args.name,
			permission: args.permission
		};

		return $q(function(resolve, reject) {
			$http.put("api/stream/" + streamid, reqArgs).then(
				function(response) {
					api.httpResolveHandler(response, alertOpts, resolve, reject);
				},
				function(response) {
					api.httpRejectHandler("Server error updating stream: ", response, alertOpts, resolve, reject);
				}
			);
		});
	};

	// api.deleteStream()
	//
	//   See API documentation for details:
	//     DELETE api/stream/:streamid
	api.deleteStream = function(streamid, alertOpts) {
		return $q(function(resolve, reject) {
			$http.delete("api/stream/" + streamid).then(
				function(response) {
					api.httpResolveHandler(response, alertOpts, resolve, reject);
				},
				function(response) {
					api.httpRejectHandler("Server error deleting stream: ", response, alertOpts, resolve, reject);
				}
			);
		});
	};

	// api.getSubscriptionsByStream()
	//
	//   See API documentation for details:
	//     GET api/subscription/:streamid
	api.getSubscriptionsByStream = function(streamid, alertOpts) {
		return $q(function(resolve, reject) {
			$http.get("api/subscription/" + streamid).then(
				function(response) {
					api.httpResolveHandler(response, alertOpts, resolve, reject);
				},
				function(response) {
					api.httpRejectHandler("Server error getting subscriptions for stream: ", response, alertOpts, resolve, reject);
				}
			);
		});
	};

	// api.getSubscriptionsByUser()
	//
	//   See API documentation for details:
	//     GET api/subscription/user/:userid
	api.getSubscriptionsByUser = function(userid, alertOpts) {
		return $q(function(resolve, reject) {
			$http.get("api/subscription/user/" + userid).then(
				function(response) {
					api.httpResolveHandler(response, alertOpts, resolve, reject);
				},
				function(response) {
					api.httpRejectHandler("Server error getting subscriptions for user: ", response, alertOpts, resolve, reject);
				}
			);
		});
	};

	// api.getSubscriptionState()
	//
	//   See API documentation for details:
	//     GET api/subscription/user/:userid
	api.getSubscriptionState = function(streamid, userid, alertOpts) {
		return $q(function(resolve, reject) {
			$http.get("api/subscription/" + streamid + "/state?userid=" + userid).then(
				function(response) {
					api.httpResolveHandler(response, alertOpts, resolve, reject);
				},
				function(response) {
					api.httpRejectHandler("Server error getting subscription state: ", response, alertOpts, resolve, reject);
				}
			);
		});
	};

	// api.getSubscriptionState()
	//
	//   See API documentation for details:
	//     POST api/subscription/:streamid
	api.subscribeUserToStream = function(userid, streamid, alertOpts) {
		return $q(function(resolve, reject) {
			$http.post("api/subscription/" + streamid, {
				userid: userid
			}).then(
				function(response) {
					api.httpResolveHandler(response, alertOpts, resolve, reject);
				},
				function(response) {
					api.httpRejectHandler("Server error creating subscription: ", response, alertOpts, resolve, reject);
				}
			);
		});
	};

	// api.getSubscriptionState()
	//
	//   See API documentation for details:
	//     POST api/subscription/:streamid
	api.unsubscribeUserFromStream = function(userid, streamid, alertOpts) {
		return $q(function(resolve, reject) {
			$http.delete("api/subscription/" + streamid + "?userid=" + userid).then(
				function(response) {
					api.httpResolveHandler(response, alertOpts, resolve, reject);
				},
				function(response) {
					api.httpRejectHandler("Server error deleting subscription: ", response, alertOpts, resolve, reject);
				}
			);
		});
	};

	// api.getInvitesByStream()
	//
	//   See API documentation for details:
	//     GET api/invite/:streamid
	api.getInvitesByStream = function(streamid, alertOpts) {
		return $q(function(resolve, reject) {
			$http.get("api/invite/" + streamid).then(
				function(response) {
					api.httpResolveHandler(response, alertOpts, resolve, reject);
				},
				function(response) {
					api.httpRejectHandler("Server error getting invites for stream: ", response, alertOpts, resolve, reject);
				}
			);
		});
	};

	// api.getInvitesByStream()
	//
	//   See API documentation for details:
	//     GET api/invite/user/:userid
	api.getInvitesByUser = function(userid, alertOpts) {
		return $q(function(resolve, reject) {
			$http.get("api/invite/user/" + userid).then(
				function(response) {
					api.httpResolveHandler(response, alertOpts, resolve, reject);
				},
				function(response) {
					api.httpRejectHandler("Server error getting invites for user: ", response, alertOpts, resolve, reject);
				}
			);
		});
	};

	// api.inviteUserToStream()
	//
	//   See API documentation for details:
	//     POST api/invite/:streamid
	api.inviteUserToStream = function(userid, streamid, alertOpts) {
		return $q(function(resolve, reject) {
			$http.post("api/invite/" + streamid, {
				userid: userid
			}).then(
				function(response) {
					api.httpResolveHandler(response, alertOpts, resolve, reject);
				},
				function(response) {
					api.httpRejectHandler("Server error creating invitation: ", response, alertOpts, resolve, reject);
				}
			);
		});
	};

	// api.uninviteUserFromStream()
	//
	//   See API documentation for details:
	//     DELETE api/invite/:streamid
	api.uninviteUserFromStream = function(userid, streamid, alertOpts) {
		return $q(function(resolve, reject) {
			$http.delete("api/invite/" + streamid + "?userid=" + userid).then(
				function(response) {
					api.httpResolveHandler(response, alertOpts, resolve, reject);
				},
				function(response) {
					api.httpRejectHandler("Server error deleting invitation: ", response, alertOpts, resolve, reject);
				}
			);
		});
	};

	// api.getInviteRequestsByStream()
	//
	//   See API documentation for details:
	//     GET api/invite/:streamid/request
	api.getInviteRequestsByStream = function(streamid, alertOpts) {
		return $q(function(resolve, reject) {
			$http.get("api/invite/" + streamid + "/request").then(
				function(response) {
					api.httpResolveHandler(response, alertOpts, resolve, reject);
				},
				function(response) {
					api.httpRejectHandler("Server error getting invite requests for stream: ", response, alertOpts, resolve, reject);
				}
			);
		});
	};

	// api.getInvitesByStream()
	//
	//   See API documentation for details:
	//     GET api/invite/user/:userid/request
	api.getInviteRequestsByUser = function(userid, alertOpts) {
		return $q(function(resolve, reject) {
			$http.get("api/invite/user/" + userid + "/request").then(
				function(response) {
					api.httpResolveHandler(response, alertOpts, resolve, reject);
				},
				function(response) {
					api.httpRejectHandler("Server error getting invite requests for user: ", response, alertOpts, resolve, reject);
				}
			);
		});
	};

	// api.requestInviteUserToStream()
	//
	//   See API documentation for details:
	//     POST api/invite/:streamid/request
	api.requestInviteUserToStream = function(userid, streamid, alertOpts) {
		return $q(function(resolve, reject) {
			$http.post("api/invite/" + streamid + "/request", {
				userid: userid
			}).then(
				function(response) {
					api.httpResolveHandler(response, alertOpts, resolve, reject);
				},
				function(response) {
					api.httpRejectHandler("Server error creating invite request: ", response, alertOpts, resolve, reject);
				}
			);
		});
	};

	// api.unrequestInviteUserToStream()
	//
	//   See API documentation for details:
	//     DELETE api/invite/:streamid/request
	api.unrequestInviteUserToStream = function(userid, streamid, alertOpts) {
		return $q(function(resolve, reject) {
			$http.delete("api/invite/" + streamid + "/request?userid=" + userid).then(
				function(response) {
					api.httpResolveHandler(response, alertOpts, resolve, reject);
				},
				function(response) {
					api.httpRejectHandler("Server error deleting invite request: ", response, alertOpts, resolve, reject);
				}
			);
		});
	};

	return api;
}]);
