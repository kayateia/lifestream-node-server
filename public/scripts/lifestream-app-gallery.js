lsApp.controller("LifeStreamGalleryController", ["$scope", "$http", "lsKeepAlive", "$window", function($scope, $http, keepalive, $window) {
	var gallery = this;

	gallery.numPerLoad = 20; // number of images to load at  time
	gallery.myStreams = [ 1 ]; // TODO: replace with array of stream IDs owned by user
	gallery.subscribedStreams = [ 1 ]; //TODO: replace with array of stream IDs to which user is subscribed
	gallery.images = {
		mine: [],
		other: []
	};

	keepalive.begin();

	gallery.keepAlivePing = function() {
		keepalive.ping();
	};

	// Parameters:
	//   into - The array into which to store data from the server.
	//   streams - An array of stream IDs from which to load images.
	//   fromTime - (optional) UNIX time. Only load images older than this.
	gallery.loadImages = function(into, streams, fromTime) {
		streams.forEach(function(id) {
			console.log("Getting images for stream " + id);
			$http.get("/api/stream/" +  id + "/contents?count=" + gallery.numPerLoad + (fromTime ? "&fromTime=" + fromTime : ""))
				.then(
					function done(response) {
						console.log("Server response: " + JSON.stringify(response.data));
						if (response.data.success) {
							response.data.images.forEach(function(image) {
								into.push({
									url: "/api/image/get/" + image.id,
									uploader: image.userLogin,
									uploadTime: image.uploadTime,
									comment: image.comment
								});
							});
						}
					},
					function fail(response) {
						$window.alert("Server error: " + response.status + " " + response.statusText);
					}
				);
		});
	};

	// Load most recent images in streams on page load.
	gallery.loadImages(gallery.images.mine, gallery.myStreams);

	$scope.$on("destroy", function() {
		keepalive.end();
	});
}]);
