lsApp.config([ "$routeProvider", function($routeProvider) {
	$routeProvider
		.when("/mine", {
			controller: "MyStreamsController",
			templateUrl: "./partials/stream-mine.html"
		})
		.when("/subscriptions", {
			controller: "SubscriptionsController",
			templateUrl: "./partials/horizontal-form.html"
		})
		.when("/subscribers", {
			controller: "SubscribersController",
			templateUrl: "./partials/horizontal-form.html"
		})
}]);

lsApp.controller("LifeStreamsManager", [ "$scope", "$location", "$http", "lsAlerts", "lsKeepAlive", "$timeout", function($scope, $location, $http, alerts, keepalive, $timeout) {
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

	// Default to the add user tab if one wasn't specified in the URL.
	if (!$location.path()) {
		streams.activateTab("mine");
	}

	$scope.$on("$destroy", function() {
		keepalive.end();
	});
}]);

lsApp.controller("MyStreamsController", ["$scope", "$http", "$interval", "lsAlerts", "lsSession", "$timeout", "$window", function($scope, $http, $interval, alerts, session, $timeout, $window) {
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
				alerts.remove("loadInvites", "serverError");
				if (response.data.success) {
					callback(response.data.invites);
				}
				else {
					alerts.add("danger", "Invite status could not be loaded: " + response.data.error);
				}
			},
			function fail(response) {
				alerts.add("danger", "Server error loading invites: " + response.status + " " + response.statusText, "loadInvites", "serverError");
			}
		);
	};

	formCtrl.loadStreams = function() {
		formCtrl.streams = [];
		$http.get("api/stream/list?userid=" + session.user.id).then(
			function done(response) {
				alerts.remove("loadStreams", "serverError");
				if (response.data.success) {
					response.data.streams.forEach(function(data) {
						var stream = {};
						stream.id = data.streamid;
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
				alerts.add("danger", "Server error loading streams: " + response.status + " " + response.statusText, "loadStreams", "serverError");
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
				alerts.remove("createStream", "serverError");
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
				alerts.add("danger", "Server error creating stream: " + response.status + " " + response.statusText, "createStream", "serverError");
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
				alerts.remove("deleteStream", "serverError");
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
				alerts.add("danger", "Server error deleting stream: " + response.status + " " + response.statusText, "deleteStream", "serverError");
			}
		);
	};

	formCtrl.invite = function(streamId, userLogin, $index) {
		var stream = $index === undefined ? formCtrl.getStreamObj(streamId) : formCtrl.streams[$index];

		$http.get("api/user/info/" + stream.newInvite).then(
			function done(response) {
				alerts.remove("invite", "serverError");
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
									userid: response.data.id
								});
								alerts.add("success", userLogin + " has been invited to " + stream.name);
							}
							else {
								alerts.add("danger", "Could not invite " + userLogin + ": " + response2.data.error);
							}
						},
						function fail(response2) {
							alerts.add("danger", "Server error inviting user: " + response2.status + " " + response2.statusText, "invite", "serverError");
						}
					);
				}
				else {
					alerts.add("danger", "Could not invite: " + response.data.error);
				}
			},
			function fail(response) {
				alerts.add("danger", "Server error inviting user: " + response.status + " " + response.statusText, "invite", "serverError");
			}
		);
	};

	formCtrl.uninvite = function(streamId, userId, $index) {
		var stream = $index === undefined ? formCtrl.getStreamObj(streamId) : formCtrl.streams[$index];

		$http.delete("api/invite/" + streamId + "?userid=" + userId).then(
			function done(response) {
				alerts.remove("uninvite", "serverError");
				if (response.data.success) {
					var removed = undefined;
					stream.invites.forEach(function(invite, index) {
						if (invite.userid == userId) {
							removed = stream.invites.splice(index, 1);
						}
					});
					alerts.add("success", removed[0].userLogin + "'s invitation to " + stream.name + " was revoked");
				}
				else {
					alerts.add("danger", "Could not revoke invitation: " + response.data.error);
				}
			},
			function fail(response) {
				alerts.add("danger", "Server error revoking invite: " + response.status + " " + response.statusText, "uninvite", "serverError");
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
				alerts.remove("renameStream", "serverError");
				if (response.data.success) {
					stream.name = name
					formCtrl.hideRenameStreamForm(stream.id, $index);
				}
				else {
					alerts.add("danger", "Could not rename stream: " + response.data.error);
				}
			},
			function fail(response) {
				alerts.add("danger", "Server error renaming stream: " + response.status + " " + response.statusText, "renameStream", "serverError");
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
					alerts.remove("setStreamPermission", "serverError");
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
				alerts.add("danger", "Server error setting stream permission: " + response.status + " " + response.statusText, "setStreamPermission", "serverError");
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

lsApp.controller("SubscriptionsController", ["$scope", "$http", function($scope, $http) {
	var streams = $scope.streams;
	var formCtrl = this;
	// Make this controller instance available to the template.
	$scope.formCtrl = formCtrl;

	streams.activateTab("subscriptions");
}]);

lsApp.controller("SubscribersController", [ "$scope", "$http", function($scope, $http) {
	var streams = $scope.streams;
	var formCtrl = this;
	// Make this controller instance available to the template.
	$scope.formCtrl = formCtrl;

	streams.activateTab("subscribers");
}]);
