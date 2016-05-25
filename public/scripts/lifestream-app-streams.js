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

	// Default to the add user tab if one wasn't specified in the URL.
	if (!$location.path()) {
		streams.activateTab("mine");
	}

	$scope.$on("$destroy", function() {
		keepalive.end();
	});
}]);

lsApp.controller("MyStreamsController", ["$scope", "$http", "lsSession", "$timeout", function($scope, $http, session, $timeout) {
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
					delete streams.alerts.loadInvites;
					callback(response.data.invites);
				}
				else {
					streams.alerts.loadInvites = {
						type: "danger",
						msg: "Invite status could not be loaded: " + response.data.error
					}
				}
			},
			function fail(response) {
				streams.alerts.loadInvites = {
					type: "danger",
					msg: "Server error: " + response.status + " " + response.statusText
				}
			}
		);
	};

	formCtrl.loadStreams = function() {
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

						delete streams.alerts.loadStreams;
					});
				}
				else {
					streams.alerts.loadStreams = {
						type: "danger",
						msg: "Streams could not be loaded: " + response.data.error
					}
				}
			},
			function fail(response) {
				streams.alerts.loadStreams = {
					type: "danger",
					msg: "Server error: " + response.status + " " + response.statusText
				}
			}
		);
	};

	formCtrl.createStream = function(name, private) {
	};

	formCtrl.deleteStream = function(streamId, $index) {
		var stream = $index === undefined ? formCtrl.getStreamObj(streamId) : formCtrl.streams[$index];
	};

	formCtrl.invite = function(streamId, userLogin, $index) {
		var stream = $index === undefined ? formCtrl.getStreamObj(streamId) : formCtrl.streams[$index];
	};

	formCtrl.uninvite = function(streamId, userId, $index) {
		var stream = $index === undefined ? formCtrl.getStreamObj(streamId) : formCtrl.streams[$index];
	};

	formCtrl.renameStream = function(streamId, name, $index) {
		var stream = $index === undefined ?  formCtrl.getStreamObj(streamId) : formCtrl.streams[$index];

		formCtrl.hideRenameStreamForm(stream.id, $index);
	};

	formCtrl.showRenameStreamForm = function(streamId, $index) {
		var stream = $index === undefined ? formCtrl.getStreamObj(streamId) : formCtrl.streams[$index];

		stream.newName = stream.name;
		formCtrl.renameStreamFormShown[stream.id] = true;
	};

	formCtrl.hideRenameStreamForm = function(streamId, $index) {
		var stream = $index === undefined ? formCtrl.getStreamObj(streamId) : formCtrl.streams[$index];

		formCtrl.renameStreamFormShown[stream.id] = false;
	};

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
