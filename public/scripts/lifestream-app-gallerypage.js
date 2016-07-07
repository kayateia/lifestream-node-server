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

angular.module("LifeStreamWebApp").controller("LifeStreamGalleryPageController", [ "$scope", "$http", "lsAlerts", "lsApi", "$routeParams", function($scope, $http, alerts, api, $routeParams) {
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
	//   callback - Called once a response has been received.
	//      Signature: callback(err, streams)
	galleryPage.loadStreams = function(userid, callback) {
		api.getStreamsByUser(userid, {
			id: "loadStreams",
			error: "Streams could not be loaded: "
		}).then(
			function(data) {
				callback(null, data.streams);
			},
			function(err) {
				if (err.data) {
					callback(err.data.error);
				}
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
		api.getUserById(userid, {
			id: "getGalleryUserInfo",
			error: "Error loading user info: "
		}).then(
			function(data) {
				galleryPage.targetUser = {
					id: data.id,
					login: data.login,
					name: data.name,
					email: data.email,
					isAdmin: data.isAdmin
				};

				if (callback) {
					callback();
				}
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
		api.getStreamInfo(streamid, {
			id: "getGalleryStreamInfo",
			error: "Error loading stream info: "
		}).then(
			function(data) {
				galleryPage.targetStream = {
					id: data.id,
					userid: data.userid,
					name: data.name,
					permission: data.permission,
					userLogin: data.userLogin,
					userName: data.userName
				};

				// If there's a function waiting to know when we're done...
				if (callback) {
					callback();
				}
			}
		);
	};
}]);

angular.module("LifeStreamWebApp").controller("MainGalleryPageController", [ "$scope", "$interval", "lsSession", function($scope, $interval, session) {
	var galleryPage = $scope.galleryPage;

	// Clear any streams shown by the previous controller
	galleryPage.sections = [];

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
			galleryPage.loadStreams(session.user.id, function(err, streams) {
				var streamIds = [];

				if (err) {
					return;
				}

				// Produce array of stream IDs belonging to user
				streams.forEach(function(stream) {
					streamIds.push(stream.id);
				});

				// Display all stream IDs belonging to user in a single
				// gallery section. This section should always be first on the
				// page
				galleryPage.sections[0] = {
					title: "Your uploads",
					streamIds: streamIds
				};
			});

			// Next, load the current user's subscriptions
			galleryPage.loadSubscriptions(session.user.id, function(subscriptions) {
				var streamIds = [];

				// Produce array of stream IDs belonging to user
				subscriptions.forEach(function(subscription) {
					streamIds.push(subscription.streamid);
				});

				// Display aggregate gallery section of recent additions to any
				// stream to which the user is subscribed. This section should
				// always be second on the page
				galleryPage.sections[1] = {
					title: "Recent additions to your subscriptions",
					streamIds: streamIds
				};

				// Display a row for each gallery to which the user is
				// subscribed. This section should always come after the prior
				// two
				subscriptions.forEach(function(subscription) {
					if (galleryPage.sections.length < 2) {
						galleryPage.sections[2] = {
							title: subscription.streamName,
							streamIds: [ subscription.streamid ]
						};
					}
					else {
						galleryPage.sections.push({
							title: subscription.streamName,
							streamIds: [ subscription.streamid ]
						});
					}
				});
			});
		}
	}, 100);
}]);

angular.module("LifeStreamWebApp").controller("UserGalleryPageController", [ "$scope", "$routeParams", function($scope, $routeParams) {
	var galleryPage = $scope.galleryPage;

	// Clear any streams shown by the previous controller
	galleryPage.sections = [];

	// Load targetted user's info
	galleryPage.getGalleryUserInfo($routeParams.userid, function() {
		galleryPage.loadStreams(galleryPage.targetUser.id, function(err, streams) {
			var streamIds = [];

			if (err) {
				return;
			}

			// Produce array of stream IDs belonging to user
			streams.forEach(function(stream) {
				streamIds.push(stream.id);
			});

			// Display aggregate gallery section containing all user activity.
			// This section should always be first on the page
			galleryPage.sections[0] = {
				title: "Recent additions from " + galleryPage.targetUser.name,
				streamIds: streamIds
			};

			// Display an additional gallery section for each stream belonging
			// to the user. This section should always come after the prior one
			streams.forEach(function(stream) {
				if (galleryPage.sections.length < 1 ) {
					galleryPage.sections[1] = {
						title: stream.name,
						streamIds: [ stream.id ]
					};
				}
				else {
					galleryPage.sections.push({
						title: stream.name,
						streamIds: [ stream.id ]
					});
				}
			});
		});
	});
}]);

angular.module("LifeStreamWebApp").controller("StreamGalleryPageController", [ "$scope", "$routeParams", function($scope, $routeParams) {
	var galleryPage = $scope.galleryPage;

	// Clear any streams shown by the previous controller
	galleryPage.sections = [];

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
