angular.module("LifeStreamWebApp").config([ "$routeProvider", function($routeProvider) {
	$routeProvider
		.when("/.", {
			controller: "MainGalleryPageController",
			templateUrl: "./partials/lifestream-gallerypage-user.html"
		})
		.when("/user/:userid", {
			controller: "UserGalleryPageController",
			templateUrl: "./partials/lifestream-gallerypage-user.html"
		})
		.when("/stream/:streamid", {
			controller: "StreamGalleryPageController",
			templateUrl: "./partials/lifestream-gallerypage-stream.html"
		})
		.otherwise("/.");
}]);

angular.module("LifeStreamWebApp").controller("LifeStreamGalleryPageController", [ "$scope", "$http", "lsAlerts", "$routeParams", function($scope, $http, alerts, $routeParams) {
	var galleryPage = this;

	// Expose $routeParams to template
	$scope.$routeParams = $routeParams;

	// Array of gallery sections to display, with each element in the array
	// corresponding to the contents of one lsGallery element. The array has the
	// following structure:
	//
	// [
	//   {
	//     title: 'Title of the galery section'
	//     streamIds: [
	//       stream ID,
	//       ...
	//     ]
	//   },
	//   ...
	// ]
	galleryPage.sections = [];

	// Populated if the page is showing images from a specific user or stream
	galleryPage.targetUser = {};

	// Populated if the page is showing images from a specific user or stream
	galleryPage.targetStream = {};

	// galleryPage.loadStreams()
	//
	//   Loads list of streams owned by user, and stores the list for later user
	//   in galleryPage.streams.
	//
	// Parameters:
	//   userid - ID of user whose streams to load
	//   callback - Called with an array of stream objects as the only parameter
	//     once a response has been received
	galleryPage.loadStreams = function(userid, callback) {
		$http.get("api/stream/list?userid=" + userid).then(
			function done(response) {
				alerts.remove("loadStreams", "persistent");
				if (response.data.success) {
					callback(response.data.streams);
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

	// galleryPage.loadSubscriptions()
	//
	//   Loads list of streams to which user is subscribed, and stores the list
	//   for later user in galleryPage.subscriptions.
	//
	// Parameters:
	//   userid - ID of user whose streams to load
	//   callback - Called with an array of subscription objects as the only
	//     parameter once a response has been received
	galleryPage.loadSubscriptions = function(userid, callback) {
		$http.get("api/subscription/user/" + userid).then(
			function done(response) {
				alerts.remove("loadSubscriptions", "persistent");
				if (response.data.success) {
					callback(response.data.subscriptions);
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

	// galleryPage.getGalleryUserInfo()
	//
	//   Queries the server for information about a given user ID, and stores
	//   that information for later use in galleryPage.stream.
	//
	// Parameters:
	//   userid - ID of user whose info to get
	//   callback (optional) - Called without parameters once stream info has
	//     been received
	galleryPage.getGalleryUserInfo = function(userid, callback) {
		$http.get("/api/user/" + userid).then(
			function done(response) {
				alerts.remove("getGalleryUserInfo", "persistent");
				if (response.data.success) {
					galleryPage.targetUser = {
						id: response.data.id,
						login: response.data.login,
						name: response.data.name,
						email: response.data.email,
						isAdmin: response.data.isAdmin
					};

					if (callback) {
						callback();
					}
				}
				else {
					alerts.add("danger", "Error loading user info: " + response.data.error);
				}
			},
			function fail(response) {
				alerts.add("danger", "Server error loading user info: " + response.status + " " + response.statusText, "getGalleryUserInfo", "persistent");
			}
		);
	};

	// galleryPage.getGalleryStreamInfo()
	//
	//   Queries the server for information about a given stream ID, and stores
	//   that information for later use in galleryPage.stream.
	//
	// Parameters:
	//   streamid - ID of stream whose info to get
	//   callback (optional) - Called without parameters once stream info has
	//     been received
	galleryPage.getGalleryStreamInfo = function(streamid, callback) {
		$http.get("/api/stream/" + streamid).then(
			function done(response) {
				alerts.remove("getGalleryStreamInfo", "persistent");
				if (response.data.success) {
					galleryPage.targetStream = {
						id: response.data.id,
						userid: response.data.userid,
						name: response.data.name,
						permission: response.data.permission,
						userLogin: response.data.userLogin,
						userName: response.data.userName
					};

					// If there's a function waiting to know when we're done...
					if (callback) {
						callback();
					}
				}
				else {
					alerts.add("danger", "Error loading stream info: " + response.data.error);
				}
			},
			function fail(response) {
				alerts.add("danger", "Server error loading stream info: " + response.status + " " + response.statusText, "getGalleryStreamInfo", "persistent");
			}
		);
	};
}]);

angular.module("LifeStreamWebApp").controller("MainGalleryPageController", [ "$scope", "$interval", "lsSession", function($scope, $interval, session) {
	var galleryPage = $scope.galleryPage;

	// Initialise page by loading information about the current user's
	// streams and subscriptions.
	//
	// Since session.user is populated asynchronously on page load, we
	// need to wait until session data is actually available before
	// attempting to load streams.
	galleryPage.initLoadInterval = $interval(function() {
		if (session.user.id) {
			$interval.cancel(galleryPage.initLoadInterval);
			delete galleryPage.initLoadInterval;

			// First, load streams owned by the current user
			galleryPage.loadStreams(session.user.id, function(streams) {
				var streamIds = [];

				// Clear array of streams to be shown on page
				galleryPage.sections = [];

				// Produce array of stream IDs belonging to user
				streams.forEach(function(stream) {
					streamIds.push(stream.id);
				});

				// Display all stream IDs belonging to user in a single
				// gallery section
				galleryPage.sections.push({
					title: "Your uploads",
					streamIds: streamIds
				});
			});

			// Next, load the current user's subscriptions
			galleryPage.loadSubscriptions(session.user.id, function(subscriptions) {
				var streamIds = [];

				// Produce array of stream IDs belonging to user
				subscriptions.forEach(function(subscription) {
					streamIds.push(subscription.streamid);
				});

				// Display all stream IDs belonging to user in a single
				// gallery section
				galleryPage.sections.push({
					title: "Recent additions to your subscriptions",
					streamIds: streamIds
				});
			});
		}
	}, 100);
}]);

angular.module("LifeStreamWebApp").controller("UserGalleryPageController", [ "$scope", "$routeParams", function($scope, $routeParams) {
	var galleryPage = $scope.galleryPage;

	// Load targetted user's info
	galleryPage.getGalleryUserInfo($routeParams.userid, function() {
		galleryPage.loadStreams(galleryPage.targetUser.id, function(streams) {
			var streamIds = [];

			// Clear array of streams to be shown on page
			galleryPage.sections = [];

			// Produce array of stream IDs belonging to user
			streams.forEach(function(stream) {
				streamIds.push(stream.id);
			});

			// Display all stream IDs belonging to user in a single
			// gallery section
			galleryPage.sections.push({
				title: "Recent additions from " + galleryPage.targetUser.name,
				streamIds: streamIds
			});
		});
	});
}]);

angular.module("LifeStreamWebApp").controller("StreamGalleryPageController", [ "$scope", "$routeParams", function($scope, $routeParams) {
	var galleryPage = $scope.galleryPage;

	// Load targetted stream's info
	galleryPage.getGalleryStreamInfo($routeParams.streamid, function() {
		// Also load user info of stream owner
		galleryPage.getGalleryUserInfo(galleryPage.targetStream.userid);

		// Just one gallery section for the requested stream
		galleryPage.sections = [
			{
				title: galleryPage.targetStream.name,
				streamIds: [ galleryPage.targetStream.id ]
			}
		];
	});
}]);
