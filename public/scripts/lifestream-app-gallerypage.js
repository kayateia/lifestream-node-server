angular.module("LifeStreamWebApp").controller("LifeStreamGalleryPageController", [ "$scope", "$http", "$interval", "lsAlerts", "lsSession", function($scope, $http, $interval, alerts, session) {
	var galleryPage = this;

	// List of streams belonging to this user
	galleryPage.myStreams = [];

	// List of the current user's subscriptions
	galleryPage.subscriptions = [];

	galleryPage.myStreamsToString = function() {
		var retval = [];

		galleryPage.myStreams.forEach(function(stream) {
			retval.push(stream.id);
		});
		retval = retval.join(",");

		return retval;
	};

	galleryPage.loadMyStreams = function() {
		$http.get("api/stream/list?userid=" + session.user.id).then(
			function done(response) {
				if (response.data.success) {
					galleryPage.myStreams = response.data.streams;
				}
				else {
					alerts.add("danger", "Streams could not be loaded: " + response.data.error);
				}
			},
			function fail(response) {
				alerts.add("danger", "Server error loading streams: " + response.status + " " + response.statusText, "loadMyStreams", "persistent");
			}
		);
	};

	galleryPage.loadSubscriptions = function() {
		$http.get("api/subscription/user/" + session.user.id).then(
			function done(response) {
				if (response.data.success) {
					galleryPage.subscriptions = response.data.subscriptions;
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

	// Initialise page by loading list of streams this user is subscribed to.
	// Since session.user is populated asynchronously on page load, we need to
	// wait until session data is actually available before attempting to load
	// streams.
	galleryPage.initLoadInterval = $interval(function() {
		if (session.user.id) {
			$interval.cancel(galleryPage.initLoadInterval);
			delete galleryPage.initLoadInterval;
			galleryPage.loadMyStreams();
			galleryPage.loadSubscriptions();
		}
	}, 100);
}]);
