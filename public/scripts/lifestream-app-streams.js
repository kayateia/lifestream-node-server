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

	// Default to the add user tab if one wasn't specified in the URL.
	if (!$location.path()) {
		streams.activateTab("mine");
	}

	$scope.$on("$destroy", function() {
		keepalive.end();
	});
}]);

angular.module("LifeStreamWebApp").controller("MyStreamsController", ["$scope", "$http", "$interval", "lsAlerts", "lsSession", "$timeout", "$window", function($scope, $http, $interval, alerts, session, $timeout, $window) {
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

	formCtrl.getStreamObj = function(streamId) {
		var retval = undefined;

		formCtrl.streams.forEach(function(value) {
			if (value.id == streamId) {
				retval = value;
			}
		});

		return retval;
	}

	formCtrl.loadInvites = function(streamId, callback) {
		$http.get("api/invite/" + streamId).then(
			function done(response) {
				alerts.remove("loadInvites", "persistent");
				if (response.data.success) {
					callback(response.data.invites);
				}
				else {
					alerts.add("danger", "Invite status could not be loaded: " + response.data.error);
				}
			},
			function fail(response) {
				alerts.add("danger", "Server error loading invites: " + response.status + " " + response.statusText, "loadInvites", "persistent");
			}
		);
	};

	formCtrl.loadStreams = function() {
		$http.get("api/stream/list?userid=" + session.user.id).then(
			function done(response) {
				alerts.remove("loadStreams", "persistent");
				if (response.data.success) {
					formCtrl.streams = []; // repopulate streams from scratch
					response.data.streams.forEach(function(data) {
						var stream = {};
						stream.id = data.id;
						stream.name = data.name;
						stream.permission = data.permission.toString();
						stream.newInvite = "";
						formCtrl.streams.push(stream);

						// Keep track of the permission that used to be set for
						// this stream, for prcessing by setStreamPermission()
						stream.oldPermission = stream.permission;

						// Make separate API call to load invites for this
						// stream.
						formCtrl.loadInvites(stream.id, function(invites) {
							stream.invites = invites;
						});
					});
				}
				else {
					alerts.add("danger", "Streams could not be loaded: " + response.data.error);
				}
			},
			function fail(response) {
				alerts.add("danger", "Server error loading streams: " + response.status + " " + response.statusText, "loadStreams", "persistent");
			}
		);
	};

	formCtrl.createStream = function(name, permission) {
		if (name == "") {
			alerts.add("danger", "Stream name cannot be blank");
			return;
		}

		$http.post("api/stream",
			{
				userid: session.user.id,
				name: name,
				permission: permission
			}
		).then(
			function done(response) {
				alerts.remove("createStream", "persistent");
				if (response.data.success) {
					alerts.add("success", name + " created");

					// Refresh list of streams
					formCtrl.loadStreams();
				}
				else {
					alerts.add("danger", "Could not create stream: " + response.data.error);
				}
			},
			function fail(response) {
				alerts.add("danger", "Server error creating stream: " + response.status + " " + response.statusText, "createStream", "persistent");
			}
		);
	};

	formCtrl.deleteStream = function(streamId, $index) {
		var stream = $index === undefined ? formCtrl.getStreamObj(streamId) : formCtrl.streams[$index];

		var confirm = $window.confirm("Really delete the stream named \"" + stream.name + "\"?");
		if (!confirm) {
			return;
		}

		$http.delete("api/stream/" + streamId).then(
			function done(response) {
				alerts.remove("deleteStream", "persistent");
				if (response.data.success) {
					alerts.add("success", stream.name + " was deleted");

					// Refresh list of streams
					formCtrl.loadStreams();
				}
				else {
					alerts.add("danger", "Could not delete stream: " + response.data.error);
				}
			},
			function fail(response) {
				alerts.add("danger", "Server error deleting stream: " + response.status + " " + response.statusText, "deleteStream", "persistent");
			}
		);
	};

	formCtrl.invite = function(streamId, userLogin, $index) {
		var stream = $index === undefined ? formCtrl.getStreamObj(streamId) : formCtrl.streams[$index];

		$http.get("api/user/info/" + stream.newInvite).then(
			function done(response) {
				alerts.remove("invite", "persistent");
				if (response.data.success) {
					$http.post("api/invite/" + stream.id,
						{
							userid: response.data.id
						}
					).then(
						function done(response2) {
							if (response2.data.success) {
								stream.invites.push({
									streamid: streamId,
									userLogin: userLogin,
									userName: response.data.name,
									userid: response.data.id
								});
								alerts.add("success", "Invited " + response.data.name + " to " + stream.name);
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
				else {
					alerts.add("danger", "Could not invite: " + response.data.error);
				}
			},
			function fail(response) {
				alerts.add("danger", "Server error inviting user: " + response.status + " " + response.statusText, "invite", "persistent");
			}
		);
	};

	formCtrl.uninvite = function(streamId, userId, $index) {
		var stream = $index === undefined ? formCtrl.getStreamObj(streamId) : formCtrl.streams[$index];

		$http.delete("api/invite/" + streamId + "?userid=" + userId).then(
			function done(response) {
				alerts.remove("uninvite", "persistent");
				if (response.data.success) {
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

	formCtrl.renameStream = function(streamId, name, $index) {
		var stream = $index === undefined ? formCtrl.getStreamObj(streamId) : formCtrl.streams[$index];

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

		$http.put("api/stream/" + streamId,
			{
				name: name
			}
		).then(
			function done(response) {
				alerts.remove("renameStream", "persistent");
				if (response.data.success) {
					stream.name = name
					formCtrl.hideRenameStreamForm(stream.id, $index);
				}
				else {
					alerts.add("danger", "Could not rename stream: " + response.data.error);
				}
			},
			function fail(response) {
				alerts.add("danger", "Server error renaming stream: " + response.status + " " + response.statusText, "renameStream", "persistent");
			}
		);
	};

	formCtrl.showRenameStreamForm = function(streamId, $index) {
		var stream = $index === undefined ? formCtrl.getStreamObj(streamId) : formCtrl.streams[$index];

		stream.newName = stream.name;
		formCtrl.renameStreamFormShown[stream.id] = true;
		$timeout(function() {
			$("#streamNewName-" + stream.id).focus();
		}, 0);
	};

	formCtrl.hideRenameStreamForm = function(streamId, $index) {
		var stream = $index === undefined ? formCtrl.getStreamObj(streamId) : formCtrl.streams[$index];

		formCtrl.renameStreamFormShown[stream.id] = false;
	};

	formCtrl.setStreamPermission = function(streamId, permission, $index) {
		var stream = $index === undefined ? formCtrl.getStreamObj(streamId) : formCtrl.streams[$index];

		$http.put("api/stream/" + streamId,
			{
				permission: stream.permission
			}
		).then(
			function done(response) {
				if (response.data.success) {
					alerts.remove("setStreamPermission", "persistent");
					// Update oldPermission for future runs of
					// setStreamPermission()
					stream.oldPermission = stream.permission;
					alerts.add("success", stream.name + " permission changed");
				}
				else {
					// If change couldn't be confirmed by server, revert to
					// previous setting in the model
					stream.permission = stream.oldPermission;
					alerts.add("danger", "Could not set permission: " + response.data.error);
				}
			},
			function fail(response) {
				// If change couldn't be confirmed by server, revert to previous
				// setting in the model
				stream.permission = stream.oldPermission;
				alerts.add("danger", "Server error setting stream permission: " + response.status + " " + response.statusText, "setStreamPermission", "persistent");
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

angular.module("LifeStreamWebApp").controller("SubscriptionsController", ["$scope", "$http", "$interval", "lsAlerts", "lsSession", function($scope, $http, $interval, alerts, session) {
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
		$http.get("api/user/search?q=" + encodeURIComponent(terms)).then(
			function done(response) {
				if (response.data.success) {
					formCtrl.search.users = response.data.users;
					if (formCtrl.search.users.length == 0) {
						alerts.add("info", "No matching users");
					}
				}
				else {
					alerts.add("danger", "Error searching users: " + response.data.error);
				}
			},
			function fail(response) {
				alerts.add("danger", "Server error searching users: " + response.status + " " + response.statusText, "submitSearch", "persistent");
			}
		);
		// Search stream names for substring
		$http.get("api/stream/search?q=" + encodeURIComponent(terms)).then(
			function done(response) {
				if (response.data.success) {
					formCtrl.search.streams = response.data.streams;
					if (formCtrl.search.streams.length == 0) {
						alerts.add("info", "No matching streams");
					}
				}
				else {
					alerts.add("danger", "Error searching streams: " + response.data.error);
				}
			},
			function fail(response) {
				alerts.add("danger", "Server error searching streams: " + response.status + " " + response.statusText, "submitSearch", "persistent");
			}
		);
	};

	formCtrl.loadSubscriptions = function() {
		$http.get("api/subscription/user/" + session.user.id).then(
			function done(response) {
				if (response.data.success) {
					formCtrl.subscriptions = response.data.subscriptions;
				}
				else {
					alerts.add("danger", "Subscriptions could not be loaded: " + response.data.error);
				}
			},
			function fail(response) {
				alerts.add("danger", "Server error loading subscriptions: " + response.status + " " + response.statusText, "loadSubscriptions", "persistent");
			}
		);
	};

	formCtrl.collapseUser = function(id, $event) {
		delete formCtrl.search.userStreams[id];
	};

	formCtrl.expandUser = function(id, $event) {
		$http.get("api/stream/list?userid=" + id).then(
			function done(response) {
				if (response.data.success) {
					formCtrl.search.userStreams[id] = response.data.streams;
				}
				else {
					alerts.add("danger", "Could not list streams from user: " + response.data.error);
				}
			},
			function fail(response) {
				alerts.add("danger", "Server error listing streams from user: " + response.status + " " + response.statusText, "loadSubscriptions", "persistent");
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

	formCtrl.requestInvite = function(stream) {
		// TODO: implement invite request system
	};

	formCtrl.findSubscriptionObj = function(id) {
		for (var i = 0; i < formCtrl.subscriptions.length; i++) {
			if (formCtrl.subscriptions[i].id == id) {
				return i;
			}
		}

		return -1;
	};

	formCtrl.subscribe = function(stream, $event) {
		// Don't actually go anywhere
		$event.preventDefault();

		$http.post("api/subscription/" + stream.id,
			{
				userid: session.user.id
			}
		).then(
			function done(response) {
				if (response.data.success) {
					formCtrl.subscriptions.push({
						streamid: stream.id,
						streamName: stream.name,
						userid: stream.userid,
						userLogin: stream.userLogin,
						userName: stream.userName
					});
					alerts.add("success", "Subscribed to " + stream.name);
				}
				else {
					alerts.add("danger", "Could not subscribe to stream: " + response.data.error);
				}
			},
			function fail(response) {
				alerts.add("danger", "Server error subscribing to stream: " + response.status + " " + response.statusText, "loadSubscriptions", "persistent");
			}
		);
	};

	formCtrl.unsubscribe = function(subscription, $event) {
		// Don't actually go anywhere
		$event.preventDefault();

		$http.delete("api/subscription/" + subscription.streamid + "?userid=" + session.user.id).then(
			function done(response) {
				if (response.data.success) {
					var index = formCtrl.findSubscriptionObj(subscription.streamid);
					formCtrl.subscriptions.splice(index, 1);
					alerts.add("success", "Unsubscribed from " + subscription.streamName);
				}
				else {
					alerts.add("danger", "Could not unsubscribe from stream: " + response.data.error);
				}
			},
			function fail(response) {
				alerts.add("danger", "Server error unsubscribing from stream: " + response.status + " " + response.statusText, "loadSubscriptions", "persistent");
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
			formCtrl.loadSubscriptions();
		}
	}, 100);
}]);

angular.module("LifeStreamWebApp").controller("SubscribersController", [ "$scope", "$http", "$interval", "lsAlerts", "lsSession", function($scope, $http, $interval, alerts, session) {
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
		$http.get("api/stream/list?userid=" + session.user.id).then(
			function done(response) {
				alerts.remove("loadStreams", "persistent");
				if (response.data.success) {
					formCtrl.streams = []; // repopulate streams from scratch
					response.data.streams.forEach(function(data) {
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
				else {
					alerts.add("danger", "Streams could not be loaded: " + response.data.error);
				}
			},
			function fail(response) {
				alerts.add("danger", "Server error loading streams: " + response.status + " " + response.statusText, "loadStreams", "persistent");
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
			$http.get("api/subscription/" + stream.id).then(
				function done(response) {
					if (response.data.success) {
						console.log(response.data);
						formCtrl.subscribers[stream.id] = response.data.subscriptions;
					}
					else {
						alerts.add("danger", "Subscribers could not be loaded: " + response.data.error);
					}
				},
				function fail(response) {
					alerts.add("danger", "Server error loading subscribers: " + response.status + " " + response.statusText, "loadStreams", "persistent");
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

		$http.delete("api/subscription/" + subscriber.streamid + "?userid=" + subscriber.userid).then(
			function done(response) {
				if (response.data.success) {
					var index = formCtrl.findSubscriberObj(subscriber.streamid, subscriber.userid);
					alerts.add("success", "Unsubscribed " + subscriber.userName + " from " + stream.name);
				}
				else {
					alerts.add("danger", "Could not unsubscribe from stream: " + response.data.error);
				}
			},
			function fail(response) {
				alerts.add("danger", "Server error unsubscribing from stream: " + response.status + " " + response.statusText, "loadSubscriptions", "persistent");
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
