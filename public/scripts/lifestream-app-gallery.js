lsApp.controller("LifeStreamGalleryController", ["$scope", "$http", "lsKeepAlive", "lsSession", "$window", function($scope, $http, keepalive, session, $window) {
	var gallery = this;

	gallery.numPerLoad = 10; // number of images to load at  time
	gallery.myStreams = [ 1 ]; // TODO: replace with array of stream IDs owned by user. Generally, the array should contain a single element specifying the user's auto-upload stream; otherwise, the same image may appear multiple times in the gallery if it's referenced from multiple streams
	gallery.subscribedStreams = [ 1 ]; //TODO: replace with array of stream IDs to which user is subscribed
	gallery.zoomed = false; // true after user clicks on in image in the grid

	// Each property under gallery.images is an array object. These array
	// objects are intended to be populated by gallery.loadImages().
	//
	// Each element in the array is an object of the form:
	//   {
	//     thumbUrl: URL of a thumbnail image
	//     url: URL to a corresponding full size image
	//     uploader: the username of the image's uploader
	//     uploadTime: the time the image was uploaded (seconds since epoch)
	//     comment: a string that the uploader may optionally add
	//   }
	//
	// Additionally, each array object has the following properties:
	//   expanded - true when the gallery section corresponding to this array
	//     is expanded
	gallery.images = {
		mine: [],
		other: []
	};

	keepalive.begin();

	gallery.keepAlivePing = function() {
		keepalive.ping();
	};

	// Parameters:
	//   arr - An array object under gallery.images, to store data from the
	//     server.
	//   streams - An array of stream IDs from which to load images.
	//   fromTime - (optional) UNIX time. Only load images older than this.
	gallery.loadImages = function(arr, streams, fromTime) {
		streams.forEach(function(id) {
			$http.get("api/stream/" +  id + "/contents?count=" + gallery.numPerLoad + (fromTime ? "&fromTime=" + fromTime : ""))
				.then(
					function done(response) {
						if (response.data.success) {
							response.data.images.forEach(function(image) {
								// Add this image's info to the target array
								arr.push({
									thumbUrl: "api/image/get/" + image.id + "?scaleTo=192&scaleMode=cover",
									url: "api/image/get/" + image.id,
									uploader: image.userLogin,
									uploadTime: image.uploadTime,
									comment: image.comment
								});

								// Record this image's upload time. Since
								// images are sent from the server in reverse
								// chronological order, the current image is
								// always the oldest image that has been
								// received thus far
								arr.oldestTime = image.uploadTime;
							});
						}
					},
					function fail(response) {
						$window.alert("Server error: " + response.status + " " + response.statusText);
					}
				);
		});
	};

	// Parameters:
	//   arr - An array object under gallery.images.
	gallery.collapseGrid = function(arr) {
		arr.expanded = false;
	};

	// Parameters:
	//   arr - An array object under gallery.images.
	//   streams - An array of stream IDs from which to load images.
	gallery.expandGrid = function(arr, streams) {
		arr.expanded = true;
	};

	// Paramters:
	//   arr - An array object populated by loadImages()
	//   index - The index of the image within the array
	gallery.zoomImage = function(arr, index) {
		gallery.zoomed;
		$window.location.href = arr[index].url;
	};

	// Load most recent images in streams on page load.
	gallery.loadImages(gallery.images.mine, gallery.myStreams);
	// Load user info on page load
	session.queryUserInfo(userLogin);

	$scope.$on("$destroy", function() {
		keepalive.end();
	});
}]);
