lsApp.controller("LifeStreamsManager", [ "$scope", "$location", "$http", "lsKeepAlive", function($scope, $location, $http, keepalive) {
	var streams = this;

	streams.alerts = {};
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
		streams.alerts = {};
	};

	streams.setAlert = function(key, type, msg) {
		streams.alerts[key] = {
			type: type,
			msg: msg
		};
	};

	streams.unsetAlert = function(key) {
		delete streams.alerts[key];
	};

	// Default to the add user tab if one wasn't specified in the URL.
	if (!$location.path()) {
		streams.activateTab("mine");
	}

	$scope.$on("$destroy", function() {
		keepalive.end();
	});
}]);

lsApp.controller("MyStreamsController", ["$scope", "$http", "lsSession", "$timeout", "$window", function($scope, $http, session, $timeout, $window) {
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
	/*formCtrl.streams = [
		{
			id: 1,
			name: "Test stream name",
			permission: "1",
			invites: [
				{
					userid: 1,
					login: "admin"
				}
			]
		}
	];*/

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
				if (response.data.success) {
					streams.unsetAlert("loadInvites");
					callback(response.data.invites);
				}
				else {
					streams.setAlert("loadInvites", "danger", "Invite status could not be loaded: " + response.data.error);
				}
			},
			function fail(response) {
				streams.setAlert("loadInvites", "danger", "Server error: " + response.status + " " + response.statusText);
			}
		);
	};

	formCtrl.loadStreams = function() {
		formCtrl.streams = [];
		$http.get("api/stream/list?userid=" + session.user.id).then(
			function done(response) {
				if (response.data.success) {
					response.data.streams.forEach(function(data) {
						var stream = {};
						stream.id = data.streamid;
						stream.name = data.name;
						stream.permission = data.permission.toString();
						stream.newInvite = "";

						// Make separate API call to load invites for this
						// stream.
						formCtrl.loadInvites(stream.id, function(invites) {
							stream.invites = invites;

							// Finally, add this stream to the list.
							formCtrl.streams.push(stream);
						});

						streams.unsetAlert("loadStreams");
					});
				}
				else {
					streams.setAlert("loadStreams", "danger", "Streams could not be loaded: " + response.data.error);
				}
			},
			function fail(response) {
				streams.setAlert("loadStreams", "danger", "Server error: " + response.status + " " + response.statusText);
			}
		);
	};

	formCtrl.createStream = function(name, private) {
		if (name == "") {
			streams.setAlert("createStream", "danger", "Stream name cannot be blank");
			return;
		}

		$http.post("api/stream",
			{
				userid: session.user.id,
				name: formCtrl.newStream.name,
				permission: formCtrl.newStream.permission
			}
		).then(
			function done(response) {
				if (response.data.success) {
					streams.setAlert("createStream", "success", "New stream created.");

					// Refresh list of streams
					formCtrl.loadStreams();
				}
				else {
					streams.setAlert("createStream", "danger", "Could not create stream: " + response.data.error);
				}
			},
			function fail(response) {
				streams.setAlert("createStream", "danger", "Server error: " + response.status + " " + response.statusText);
			}
		);
	};

	formCtrl.deleteStream = function(streamId, $index) {
		var stream = $index === undefined ? formCtrl.getStreamObj(streamId) : formCtrl.streams[$index];

		var confirm = $window.confirm("Really delete the stream named \"" + formCtrl.streams[$index].name + "\"?");
		if (!confirm) {
			return;
		}

		$http.delete("api/stream/" + streamId).then(
			function done(response) {
				if (response.data.success) {
					streams.unsetAlert("deleteStream");

					// Refresh list of streams
					formCtrl.loadStreams();
				}
				else {
					streams.setAlert("deleteStream", "danger", "Could not delete stream: " + response.data.error);
				}
			},
			function fail(response) {
				streams.setAlert("deleteStream", "danger", "Server error: " + response.status + " " + response.statusText);
			}
		);
	};

	formCtrl.invite = function(streamId, userLogin, $index) {
		var stream = $index === undefined ? formCtrl.getStreamObj(streamId) : formCtrl.streams[$index];
	};

	formCtrl.uninvite = function(streamId, userId, $index) {
		var stream = $index === undefined ? formCtrl.getStreamObj(streamId) : formCtrl.streams[$index];
	};

	formCtrl.renameStream = function(streamId, name, $index) {
		var stream = $index === undefined ? formCtrl.getStreamObj(streamId) : formCtrl.streams[$index];

		if (name == "") {
			streams.setAlert("createStream", "danger", "Stream name cannot be blank");
			return;
		}

		$http.put("api/stream/" + streamId,
			{
				name: name
			}
		).then(
			function done(response) {
				if (response.data.success) {
					formCtrl.streams[$index].name = name
					formCtrl.hideRenameStreamForm(stream.id, $index);
					streams.unsetAlert("renameStream");
				}
				else {
					streams.setAlert("renameStream", "danger", "Could not create stream: " + response.data.error);
				}
			},
			function fail(response) {
				streams.setAlert("renameStream", "danger", "Server error: " + response.status + " " + response.statusText);
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
				permission: formCtrl.streams[$index].permission
			}
		).then(
			function done(response) {
				if (response.data.success) {
					streams.unsetAlert("setStreamPermission");
				}
				else {
					streams.setAlert("setStreamPermission", "danger", "Could not create stream: " + response.data.error);
				}
			},
			function fail(response) {
				streams.setAlert("setStreamPermission", "danger", "Server error: " + response.status + " " + response.statusText);
			}
		);
	}

	// Initialise page by loading available streams from the server.
	formCtrl.loadStreams();
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
