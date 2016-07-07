angular.module("LifeStreamWebApp").config([ "$routeProvider", function($routeProvider) {
	$routeProvider
		.when("/mine", {
			controller: "MyStreamsController",
			templateUrl: "./partials/stream-mine.html"
		})
		.when("/subscriptions", {
			controller: "SubscriptionsController",
			templateUrl: "./partials/stream-subscriptions.html"
		})
		.when("/subscribers", {
			controller: "SubscribersController",
			templateUrl: "./partials/stream-subscribers.html"
		})
		.otherwise("/mine");
}]);

angular.module("LifeStreamWebApp").controller("LifeStreamsManager", [ "$scope", "$location", "$http", "lsAlerts", "lsKeepAlive", "$timeout", function($scope, $location, $http, alerts, keepalive, $timeout) {
	var streams = this;

	streams.operations = [
		{
			name: "mine",
			desc: "Streams",
			url: "/mine",
			active: true
		},
		{
			name: "subscriptions",
			desc: "Subscriptions",
			url: "/subscriptions",
			active: false
		},
		{
			name: "subscribers",
			desc: "Subscribers",
			url: "/subscribers",
			active: false
		},
	];

	keepalive.begin();

	streams.keepAlivePing = function() {
		keepalive.ping();
	};

	streams.activateTab = function(name) {
		streams.operations.forEach(function(item) {
			if (item.name == name) {
				item.active = true;

				if ($location.path() != item.url) {
					$location.path(item.url);
				}
			}
			else {
				item.active = false;
			}
		});

		// Clear status alerts from the previous tab.
		alerts.clear();
	};

	streams.permissionName = function(perm) {
		var name;

		switch (perm) {
			case 1:
				name = "public";
				break;
			case 2:
				name = "needs approval";
				break;
			case 3:
				name = "hidden";
				break;
			default:
				name = "unknown";
		}

		return name;
	}

	// streams.findIndex()
	//
	//   Given a stream ID and an array of objects or an object whose properties
	//   properties are objects, find the index or key of an object inside with
	//   a property of the specified name whose value matches the stream ID.
	//
	// Parameters:
	//   id - the stream ID to look for
	//   arr - the array or object to search
	//   keyname - the name of the object property containing the stream ID
	streams.findIndex = function(id, arr, keyname) {
		if (typeof arr === "object") {
			if (arr instanceof Array) {
				for (var i = 0; i < arr.length; i++) {
					if (arr[i][keyname] == id) {
						return i;
					}
				}
			}
			else {
				for (var key in arr) {
					if (arr.hasOwnProperty(key) && arr[key][keyname] == id) {
						return key;
					}
				}
			}
		}
		return -1;
	}

	// streams.findStreamIndex()
	//
	//   Given a stream ID and an array of stream objects or object whose
	//   properties are stream objects, find the index of an object with a
	//   matching stream ID
	//
	// Parameters:
	//   id - the stream ID to look for
	//   arr - the array to search
	streams.findStreamIndex = function(id, arr) {
		return streams.findIndex(id, arr, "id");
	};

	// streams.findSubscriptionIndex()
	//
	//   Given a stream ID and an array of subscription objects or object whose
	//   properties are subscription objects, find the index of an object with a
	//   matching stream ID
	//
	// Parameters:
	//   id - the stream ID to look for
	//   arr - the array to search
	streams.findSubscriptionIndex = function(id, arr) {
		return streams.findIndex(id, arr, "streamid");
	};

	// Default to the add user tab if one wasn't specified in the URL.
	if (!$location.path()) {
		streams.activateTab("mine");
	}

	$scope.$on("$destroy", function() {
		keepalive.end();
	});
}]);

angular.module("LifeStreamWebApp").controller("MyStreamsController", ["$scope", "$http", "$interval", "lsAlerts", "lsApi", "lsSession", "$timeout", "$window", function($scope, $http, $interval, alerts, api, session, $timeout, $window) {
	var streams = $scope.streams;
	var formCtrl = this;
	// Make this controller instance available to the template.
	$scope.formCtrl = formCtrl;

	// Mark this tab as active.
	streams.activateTab("mine");

	// Keep track of streams for which the rename form is shown.
	formCtrl.renameStreamFormShown = [];

	// Data structure for newStreamForm
	formCtrl.newStream = {
		name: "",
		permission: "1" // must be string value for ngModel to map correctly to selected value displayed in view
	};

	// Data structure containing list of streams from server
	formCtrl.streams = [];

	formCtrl.loadInvites = function(streamId, callback) {
		$http.get("api/invite/" + streamId).then(
			function done(response) {
				alerts.remove("loadInvites", "persistent");
				if (response.data.success) {
					callback(response.data.invites);
				}
				else {
					alerts.add("danger", "Invites could not be loaded: " + response.data.error);
				}
			},
			function fail(response) {
				alerts.add("danger", "Server error loading invites: " + response.status + " " + response.statusText, "loadInvites", "persistent");
			}
		);
	};

	formCtrl.loadInviteRequests = function(streamId, callback) {
		$http.get("api/invite/" + streamId + "/request").then(
			function done(response) {
				alerts.remove("loadInviteRequests", "persistent");
				if (response.data.success) {
					callback(response.data.requests);
				}
				else {
					alerts.add("danger", "Invite requests could not be loaded: " + response.data.error);
				}
			},
			function fail(response) {
				alerts.add("danger", "Server error loading invite requests: " + response.status + " " + response.statusText, "loadInviteRequests", "persistent");
			}
		);
	};

	formCtrl.loadStreams = function() {
		api.getStreamsByUser(session.user.id, {
			id: "loadStreams",
			error: "Streams could not be loaded: "
		}).then(
			function(data) {
				formCtrl.streams = []; // repopulate streams from scratch
				data.streams.forEach(function(data) {
					var stream = {
						id: data.id,
						name: data.name,
						permission: data.permission.toString(),
						newInvite: ""
					};
					formCtrl.streams.push(stream);

					// Keep track of the permission that used to be set for
					// this stream, for prcessing by setStreamPermission()
					stream.oldPermission = stream.permission;

					// Make separate API call to load invites for this
					// stream.
					formCtrl.loadInvites(stream.id, function(invites) {
						stream.invites = invites;
					});

					// Make separate API call to load invite requests for this
					// stream.
					formCtrl.loadInviteRequests(stream.id, function(requests) {
						stream.requests = requests;
					});
				});
			}
		);
	};

	formCtrl.createStream = function(name, permission) {
		if (name == "") {
			alerts.add("danger", "Stream name cannot be blank");
			return;
		}

		api.createStream({
			userid: session.user.id,
			name: name,
			permission: permission
		}, {
			id: "createStream",
			success: name + " created",
			error: "Could not create stream: "
		}).then(
			function(data) {
				// Append stream to the list
				formCtrl.streams.push({
					id: data.id,
					name: name,
					permission: permission,
					newInvite: "",
					invites: []
				});
			}
		);
	};

	formCtrl.deleteStream = function(streamId, $index) {
		var index = $index === undefined ? streams.findStreamIndex(streamId, formCtrl.streams) : $index;
		var stream = formCtrl.streams[index];

		var confirm = $window.confirm("Really delete the stream named \"" + stream.name + "\"?");
		if (!confirm) {
			return;
		}

		api.deleteStream(streamId, {
			id: "deleteStream",
			success: stream.name + " was deleted",
			error: "Could not delete stream: "
		}).then(
			function(data) {
				// Remove stream from list
				formCtrl.streams.splice(index, 1);
			}
		);
	};

	formCtrl.invite = function(streamId, userLogin, $index) {
		var stream = formCtrl.streams[$index === undefined ? streams.findStreamIndex(streamId, formCtrl.streams) : $index];

		api.getUserByLogin(userLogin, {
			id: "invite",
			error: "Couldn't invite " + userLogin + ":"
		}).then(
			function(data) {
				$http.post("api/invite/" + stream.id,
					{
						userid: data.id
					}
				).then(
					function done(response2) {
						if (response2.data.success) {
							// Remove from list of requests in model (in case
							// this invite was created by accepting an
							// invite request)
							stream.requests.forEach(function(request, index) {
								if (request.userid == data.id) {
									removed = stream.requests.splice(index, 1);
								}
							});

							// Update list of invites in model
							stream.invites.push({
								streamid: streamId,
								userLogin: userLogin,
								userName: data.name,
								userid: data.id
							});
							alerts.add("success", "Invited " + data.name + " to " + stream.name);
						}
						else {
							alerts.add("danger", "Could not invite " + userLogin + ": " + response2.data.error);
						}
					},
					function fail(response2) {
						alerts.add("danger", "Server error inviting user: " + response2.status + " " + response2.statusText, "invite", "persistent");
					}
				);
			}
		);
	};

	formCtrl.uninvite = function(streamId, userId, $index) {
		var stream = formCtrl.streams[$index === undefined ? streams.findStreamIndex(streamId, formCtrl.streams) : $index];

		$http.delete("api/invite/" + streamId + "?userid=" + userId).then(
			function done(response) {
				alerts.remove("uninvite", "persistent");
				if (response.data.success) {
					// Remove invite from list in model
					var removed = undefined;
					stream.invites.forEach(function(invite, index) {
						if (invite.userid == userId) {
							removed = stream.invites.splice(index, 1);
						}
					});
					alerts.add("success", "Revoked " + removed[0].userName + "'s invitation to " + stream.name);
				}
				else {
					alerts.add("danger", "Could not revoke invitation: " + response.data.error);
				}
			},
			function fail(response) {
				alerts.add("danger", "Server error revoking invite: " + response.status + " " + response.statusText, "uninvite", "persistent");
			}
		);
	};

	formCtrl.unrequest = function(streamId, userId, $index) {
		var stream = formCtrl.streams[$index === undefined ? streams.findStreamIndex(streamId, formCtrl.streams) : $index];

		$http.delete("api/invite/" + streamId + "/request?userid=" + userId).then(
			function done(response) {
				alerts.remove("unrequest", "persistent");
				if (response.data.success) {
					// Remove from request from list in model
					var removed = undefined;
					stream.requests.forEach(function(request, index) {
						if (request.userid == userId) {
							removed = stream.requests.splice(index, 1);
						}
					});
					alerts.add("success", "Rejected " + removed[0].userName + "'s request for an invite to " + stream.name);
				}
				else {
					alerts.add("danger", "Could not reject invite request: " + response.data.error);
				}
			},
			function fail(response) {
				alerts.add("danger", "Server error rejecting invite request: " + response.status + " " + response.statusText, "unrequest", "persistent");
			}
		);
	};

	formCtrl.renameStream = function(streamId, name, $index) {
		var stream = formCtrl.streams[$index === undefined ? streams.findStreamIndex(streamId, formCtrl.streams) : $index];

		// Bail if the user didn't specify a new name
		if (name == stream.name) {
			formCtrl.hideRenameStreamForm(stream.id, $index);
			return;
		}

		// Validation
		if (name == "") {
			alerts.add("danger", "Stream name cannot be blank");
			return;
		}

		api.updateStream(streamId, {
			name: name
		}, {
			id: "renameStream",
			error: "Could not rename stream: "
		}).then(
			function(data) {
				stream.name = name
				formCtrl.hideRenameStreamForm(stream.id, $index);
			}
		);
	};

	formCtrl.showRenameStreamForm = function(streamId, $index) {
		var stream = formCtrl.streams[$index === undefined ? streams.findStreamIndex(streamId, formCtrl.streams) : $index];

		stream.newName = stream.name;
		formCtrl.renameStreamFormShown[stream.id] = true;
		$timeout(function() {
			$("#streamNewName-" + stream.id).focus();
		}, 0);
	};

	formCtrl.hideRenameStreamForm = function(streamId, $index) {
		var stream = formCtrl.streams[$index === undefined ? streams.findStreamIndex(streamId, formCtrl.streams) : $index];

		formCtrl.renameStreamFormShown[stream.id] = false;
	};

	formCtrl.setStreamPermission = function(streamId, permission, $index) {
		var stream = formCtrl.streams[$index === undefined ? streams.findStreamIndex(streamId, formCtrl.streams) : $index];

		api.updateStream(streamId, {
			permission: stream.permission
		}, {
			id: "setStreamPermission",
			success: stream.name + " permission changed",
			error: "Could not set permission: "
		}).then(
			function(data) {
				// Update oldPermission for future runs of
				// setStreamPermission()
				stream.oldPermission = stream.permission;
			},
			function(err) {
				// If change couldn't be confirmed by server, revert to
				// previous setting in the model
				stream.permission = stream.oldPermission;
			}
		);
	}

	// Initialise page by loading available streams from the server.
	// Since session.user is populated asynchronously on page load, we need to
	// wait until session data is actually available before attempting to load
	// streams.
	formCtrl.initLoadInterval = $interval(function() {
		if (session.user.id) {
				$interval.cancel(formCtrl.initLoadInterval);
				delete formCtrl.initLoadInterval;
				formCtrl.loadStreams();
		}
	}, 100);
}]);

angular.module("LifeStreamWebApp").controller("SubscriptionsController", ["$scope", "$http", "$interval", "lsAlerts", "lsApi", "lsSession", function($scope, $http, $interval, alerts, api, session) {
	var streams = $scope.streams;
	var formCtrl = this;
	// Make this controller instance available to the template.
	$scope.formCtrl = formCtrl;

	// Mark this tab as active.
	streams.activateTab("subscriptions");

	// Data used in stream search
	formCtrl.search = {
		terms: "", // search terms
		users: [], // matching users
		userStreams: {}, // streams belonging to users
		streams: [] // matching streams
	};

	// List of existing subscriptions for current user
	formCtrl.subscriptions = [];

	// formCtrl.setSubscriptionState()
	//
	//   Updates local data models to reflect a change in the stream's
	//   subscription state. This function HAS NO EFFECT on any server-side
	//   data. Its purpose is to make the various data models managed by this
	//   controller consistent, so that information dispayed to the user is
	//   consistent across different parts of the page
	//
	// Parameters:
	//   obj - stream object, invite object, request object, or subscription
	//     object
	//   state - "active", "invited", "requested", or "none"
	formCtrl.setSubscriptionState = function(obj, state) {
		var index;
		var streamid = obj.id ? obj.id : obj.streamid;

		function setStateInResults(streamid, state) {
			var index, userid, userStreams;
			for (userid in formCtrl.search.userStreams) {
				if (formCtrl.search.userStreams.hasOwnProperty(userid)) {
					userStreams = formCtrl.search.userStreams[userid];
					index = streams.findStreamIndex(streamid, userStreams);
					if (index != -1) {
						userStreams[index].subscription = state;
					}
				}
			}
			index = streams.findStreamIndex(streamid, formCtrl.search.streams);
			if (index != -1) {
				formCtrl.search.streams[index].subscription = state;
			}
		}

		if (state == "active") {
			// Append to list of subscriptions in model if not already present
			index = streams.findSubscriptionIndex(streamid, formCtrl.subscriptions);
			if (index == -1) {
				if (obj.hasOwnProperty("id")) {
					// Convert stream object into subscription object for model
					formCtrl.subscriptions.push({
						streamid: obj.id,
						streamName: obj.name,
						userid: session.user.id,
						userLogin: obj.userLogin,
						userName: obj.userName
					});
				}
				else {
					formCtrl.subscriptions.push(obj);
				}
			}

			// Remove from list of invites in model
			index = streams.findSubscriptionIndex(streamid, formCtrl.invites);
			if (index != -1) {
				formCtrl.invites.splice(index, 1);
			}

			// Remove from list of invite requests in model
			index = streams.findSubscriptionIndex(streamid, formCtrl.requests);
			if (index != -1) {
				formCtrl.requests.splice(index, 1);
			}

			// Set subscription state to "active" in search results
			setStateInResults(streamid, state);
		}
		else if (state == "invited") {
			// Append to list of invites in model if not already present.
			// This may happen if a search result arrives from the server with
			// a subscription state of "invited", which changed between the
			// search and the time the user initially loaded the page
			index = streams.findSubscriptionIndex(streamid, formCtrl.invites);
			if (index == -1) {
				// Convert stream object into invite object for model
				formCtrl.invites.push({
					streamid: obj.id,
					streamName: obj.name,
					userid: session.user.id,
					userLogin: obj.userLogin,
					userName: obj.userName
				});
			}

			// Remove from list of invite requests in model
			index = streams.findSubscriptionIndex(streamid, formCtrl.requests);
			if (index != -1) {
				formCtrl.requests.splice(index, 1);
			}

			// Set subscription state to "invited" in search results
			setStateInResults(streamid, state);
		}
		else if (state == "requested") {
			// Append to list of invite requests in model if not already
			// present
			index = streams.findSubscriptionIndex(streamid, formCtrl.requests);
			if (index == -1) {
				if (obj.hasOwnProperty("id")) {
					// Convert stream object into subscription object for model
					formCtrl.requests.push({
						streamid: obj.id,
						streamName: obj.name,
						userid: session.user.id,
						userLogin: obj.userLogin,
						userName: obj.userName
					});
				}
			}
			// It is not possible to get here from any part of the page that is
			// not a search result

			// Set subscription state to "requested" in search results
			setStateInResults(streamid, state);
		}
		else if (state == "none") {
			// Remove from list of invites in model
			index = streams.findSubscriptionIndex(streamid, formCtrl.invites);
			if (index != -1) {
				formCtrl.invites.splice(index, 1);
			}

			// Remove from list of invite requests in model
			index = streams.findSubscriptionIndex(streamid, formCtrl.requests);
			if (index != -1) {
				formCtrl.requests.splice(index, 1);
			}

			// Remove from list of subscriptions in model
			index = streams.findSubscriptionIndex(streamid, formCtrl.subscriptions);
			if (index != -1) {
				formCtrl.subscriptions.splice(index, 1);
			}

			// Set subscription state to "none" in search results
			setStateInResults(streamid, state);
		}
	};

	// formCtrl.getSubscriptionState()
	//
	//   Given an array of stream objects, query the server the subscription
	//   status of each stream in the array in relation to the current user.
	//   Possible states that may be returned by the server include:
	//     - "active": user is currently subscribed to a stream
	//     - "invited": user is invited to a stream, but not yet subscribed
	//     - "requested": user has requested an invite, but is not yet invited
	//
	// Parameters:
	//   arr - An array of stream objects
	formCtrl.getSubscriptionState = function(arr) {
		// If arr isn't an array of stream objects, there's nothing to do
		if (typeof arr !== "object" ||
			!(arr instanceof Array) ||
			arr.length < 1 ||
			arr[0].id === undefined) {
			return;
		}

		// Create comma-delimited list of stream IDs
		var streamids = [];
		arr.forEach(function(stream) {
			streamids.push(stream.id);
		});
		streamids = streamids.join(",");

		// Request subscription state for all streams in list
		api.getSubscriptionState(streamids, session.user.id, {
			id: "getSubscriptionState",
			error: "Couldn't get subscription state: "
		}).then(
			function(data) {
				data.states.forEach(function(state) {
					var index = streams.findStreamIndex(state.streamid, arr);
					formCtrl.setSubscriptionState(arr[index], state.state);
				});
			}
		);
	};

	// formCtrl.submitSearch()
	//
	//   Searches for given search terms for substring matches of stream name,
	//   user login, and user name. Search terms shorter than 3 characters in
	//   length are ignored.
	formCtrl.submitSearch = function() {
		var terms = formCtrl.search.terms.trim();

		// TODO: Be cleverer about search engine logic. For now, just send terms
		// to the server without fancy parsing
		if (terms.length < 3) {
			alerts.add("danger", "Search terms must be at least 3 characters long");
			return;
		}

		// Discard search terms shorter than 3 characters in length
		/*formCtrl.search.terms.split(" ").forEach(function(value) {
			if (value.trim().length >= 3) {
				terms.push(value.trim());
			}
		})
		if (terms.length > 0) {
			terms = terms.join(" ");
		}
		else {
			alerts.add("danger", "Search terms must be at least 3 characters long");
			return;
		}*/

		// Search user logins and user names for substring
		api.findUser(terms, {
			id: "submitSearch",
			error: "Error searching users: "
		}).then(
			function(data) {
				formCtrl.search.users = data.users;
				if (formCtrl.search.users.length == 0) {
					alerts.add("info", "No matching users");
				}
			}
		);

		// Search stream names for substring
		api.findStream(terms, {
			id: "submitSearch",
			error: "Error searching streams: "
		}).then(
			function(data) {
				if (data.streams.length > 0) {
					formCtrl.search.streams = data.streams;
					formCtrl.getSubscriptionState(formCtrl.search.streams);
				}
				else {
					alerts.add("info", "No matching streams");
				}
			}
		);
	};

	formCtrl.loadInvites = function() {
		$http.get("api/invite/user/" + session.user.id).then(
			function done(response) {
				alerts.remove("loadInvites", "persistent");
				if (response.data.success) {
					formCtrl.invites = response.data.invites;
					// No need to setSubscriptionState() here since this
					// function is only invoked once at page load; there won't
					// be updates coming from here
				}
				else {
					alerts.add("danger", "Invites could not be loaded: " + response.data.error);
				}
			},
			function fail(response) {
				alerts.add("danger", "Server error loading invites: " + response.status + " " + response.statusText, "loadInvites", "persistent");
			}
		);
	};

	formCtrl.loadInviteRequests = function() {
		$http.get("api/invite/user/" + session.user.id + "/request").then(
			function done(response) {
				alerts.remove("loadInviteRequests", "persistent");
				if (response.data.success) {
					formCtrl.requests = response.data.requests;
					// No need to setSubscriptionState() here since this
					// function is only invoked once at page load; there won't
					// be updates coming from here
				}
				else {
					alerts.add("danger", "Invite requests could not be loaded: " + response.data.error);
				}
			},
			function fail(response) {
				alerts.add("danger", "Server error loading invites requests: " + response.status + " " + response.statusText, "loadInviteRequests", "persistent");
			}
		);
	};

	formCtrl.loadSubscriptions = function() {
		api.getSubscriptionsByUser(session.user.id, {
			id: "loadSubscriptions",
			error: "Subscriptions could not be loaded: "
		}).then(
			function(data) {
				formCtrl.subscriptions = data.subscriptions;
			}
		);
	};

	formCtrl.collapseUser = function(id, $event) {
		delete formCtrl.search.userStreams[id];
	};

	formCtrl.expandUser = function(id, $event) {
		api.getStreamsByUser(id, {
			id: "expandUser",
			error: "Could not list streams from user: "
		}).then(
			function(data) {
				if (data.streams.length > 0) {
					formCtrl.search.userStreams[id] = data.streams;
					formCtrl.getSubscriptionState(formCtrl.search.userStreams[id]);
				}
				else {
					alerts.add("info", "User doesn't have any streams");
				}
			}
		);
	};

	formCtrl.toggleUser = function(id, $event) {
		// Don't actually go anywhere
		$event.preventDefault();

		if (formCtrl.search.userStreams[id] === undefined) {
			// Collapse all other users
			formCtrl.search.userStreams = {};
			// Expand the selected user
			formCtrl.expandUser(id);
		}
		else {
			formCtrl.collapseUser(id);
		}
	};

	// formCtrl.subscribe()
	//
	//   Subscribe the current user to a stream.
	//
	// Parameters:
	//   obj - A stream object or an invite object
	formCtrl.subscribe = function(obj) {
		// stream may be either a stream object or an invite object
		var streamid = obj.id ? obj.id : obj.streamid;

		api.subscribeUserToStream(session.user.id, streamid, {
			id: "subscribe",
			success: "Subscribed to " + (obj.name ? obj.name : obj.streamName),
			error: "Could not subscribe to stream: "
		}).then(
			function(data) {
				formCtrl.setSubscriptionState(obj, "active");
			}
		);
	};

	formCtrl.unsubscribe = function(subscription) {
		api.unsubscribeUserFromStream(session.user.id, subscription.streamid, {
			id: "unsubscribe",
			success: "Unsubscribed from " + subscription.streamName,
			error: "Could not unsubscribe from stream: "
		}).then(
			function(data) {
				formCtrl.setSubscriptionState(subscription, "none");
			}
		);
	};

	formCtrl.requestInvite = function(stream) {
		$http.post("api/invite/" + stream.id + "/request",
			{
				userid: session.user.id
			}
		).then(
			function done(response) {
				alerts.remove("requestInvite", "persistent");
				if (response.data.success) {
					formCtrl.setSubscriptionState(stream, "requested");
					alerts.add("success", "Requested invite to " + stream.name);
				}
				else {
					alerts.add("danger", "Could not request invite: " + response.data.error);
				}
			},
			function fail(response) {
				alerts.add("danger", "Server error requesting invite: " + response.status + " " + response.statusText, "requestInvite", "persistent");
			}
		);
	};

	formCtrl.unrequestInvite = function(obj) {
		var streamid = obj.id ? obj.id : obj.streamid;

		$http.delete("api/invite/" + streamid + "/request?userid=" + session.user.id).then(
			function done(response) {
				alerts.remove("unrequestInvite", "persistent");
				if (response.data.success) {
					formCtrl.setSubscriptionState(obj, "none");
					alerts.add("success", "Cancelled invite request to " + (obj.name ? obj.name : obj.streamName));
				}
				else {
					alerts.add("danger", "Could not request invite: " + response.data.error);
				}
			},
			function fail(response) {
				alerts.add("danger", "Server error requesting invite: " + response.status + " " + response.statusText, "unrequestInvite", "persistent");
			}
		);
	};

	// formCtrl.uninvite()
	//
	//   Revoke current user's invite to a stream
	//
	// Parameters:
	//   obj - A stream object or an invite object
	formCtrl.uninvite = function(obj) {
		// stream may be either a stream object or an invite object
		var streamid = obj.id ? obj.id : obj.streamid;

		$http.delete("api/invite/" + streamid + "?userid=" + session.user.id).then(
			function done(response) {
				alerts.remove("uninvite", "persistent");
				if (response.data.success) {
					formCtrl.setSubscriptionState(obj, "none");
					alerts.add("success", "Rejected invitation to " + (obj.name ? obj.name : obj.streamName) + " from " + obj.userName);
				}
				else {
					alerts.add("danger", "Could not reject invitation: " + response.data.error);
				}
			},
			function fail(response) {
				alerts.add("danger", "Server error rejecting invite: " + response.status + " " + response.statusText, "uninvite", "persistent");
			}
		);
	};

	// Initialise page by loading list of streams this user is subscribed to.
	// Since session.user is populated asynchronously on page load, we need to
	// wait until session data is actually available before attempting to load
	// streams.
	formCtrl.initLoadInterval = $interval(function() {
		if (session.user.id) {
			$interval.cancel(formCtrl.initLoadInterval);
			delete formCtrl.initLoadInterval;
			formCtrl.loadInvites();
			formCtrl.loadInviteRequests();
			formCtrl.loadSubscriptions();
		}
	}, 100);
}]);

angular.module("LifeStreamWebApp").controller("SubscribersController", [ "$scope", "$http", "$interval", "lsAlerts", "lsApi", "lsSession", function($scope, $http, $interval, alerts, api, session) {
	var streams = $scope.streams;
	var formCtrl = this;
	// Make this controller instance available to the template.
	$scope.formCtrl = formCtrl;

	// Mark this tab as active.
	streams.activateTab("subscribers");

	// List of streams belonging to current user
	formCtrl.streams = [];

	// List of users subscribed to each of the current user's streams
	formCtrl.subscribers = {};

	formCtrl.loadStreams = function(callback) {
		api.getStreamsByUser(session.user.id, {
			id: "loadStreams",
			error: "Streams could not be loaded: "
		}).then(
			function(data) {
				formCtrl.streams = []; // repopulate streams from scratch
				data.streams.forEach(function(data) {
					var stream = {};
					stream.id = data.id;
					stream.name = data.name;
					stream.permission = streams.permissionName(data.permission);
					formCtrl.streams.push(stream);
				});

				if (callback) {
					callback();
				}
			}
		);
	};

	// formCtrl.loadSubscribers()
	//
	//   This should be called after formCtrl.loadStreams(), as it depends on
	//   the formCtrl.streams array to be populated.
	//
	//   Loads a list of subscribers for each stream.
	formCtrl.loadSubscribers = function() {
		formCtrl.streams.forEach(function(stream) {
			api.getSubscriptionsByStream(stream.id, {
				id: "loadSubscribers",
				error: "Subscribers could not be loaded: "
			}).then(
				function(data) {
					formCtrl.subscribers[stream.id] = data.subscriptions;
				}
			);
		});
	};

	formCtrl.findSubscriberObj = function(streamid, userid) {
		for (var i = 0; i < formCtrl.subscribers[streamid].length; i++) {
			if (formCtrl.subscribers[streamid][i].userid == userid) {
				return i;
			}
		}

		return -1;
	};

	formCtrl.unsubscribe = function(subscriber, stream, $event) {
		// Don't actually go anywhere
		$event.preventDefault();

		api.unsubscribeUserFromStream(subscriber.userid, subscriber.streamid, {
			id: "unsubscribe",
			success: "Unsubscribed " + subscriber.userName + " from " + stream.name,
			error: "Could not unsubscribe from stream: "
		}).then(
			function(data) {
				var index = formCtrl.findSubscriberObj(subscriber.streamid, subscriber.userid);
				formCtrl.subscribers[subscriber.streamid].splice(index, 1);
			}
		);
	};

	// Initialise page by loading available streams from the server.
	// Since session.user is populated asynchronously on page load, we need to
	// wait until session data is actually available before attempting to load
	// streams.
	formCtrl.initLoadInterval = $interval(function() {
		if (session.user.id) {
				$interval.cancel(formCtrl.initLoadInterval);
				delete formCtrl.initLoadInterval;
				formCtrl.loadStreams(formCtrl.loadSubscribers);
		}
	}, 100);
}]);
