// Define the gallery controller
lsApp.controller("LifeStreamGalleryController", ["$scope", "$element", "$http", "lsAlerts", "lsLightbox", "lsKeepAlive", "$timeout", function($scope, $element, $http, alerts, lsLightbox, keepalive, $timeout) {
	var gallery = this;

	gallery.numImagesPerRow = 0; // Number of images that would fit on each row in the gallery, taking into account the width of the grid, the size of each thumbnail, and the margin between each thumbnail
	gallery.myStreams = [ 1 ]; // TODO: replace with array of stream IDs owned by user. Generally, the array should contain a single element specifying the user's auto-upload stream; otherwise, the same image may appear multiple times in the gallery if it's referenced from multiple streams
	gallery.subscribedStreams = [ 1 ]; //TODO: replace with array of stream IDs to which user is subscribed

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

	// Shortcut for determining whether a given image ID already exists in an
	// array.
	gallery.images.mine.ids = [];
	gallery.images.other.ids = [];

	gallery.keepAlivePing = function() {
		keepalive.ping();
	};

	// Parameters:
	//   arr - An array object under gallery.images, to store data from the
	//     server.
	//   streams - An array of stream IDs from which to load images.
	//   count - (optional) Number of images to load.
	//   olderThan - (optional) UNIX time. Only load images older than this.
	//   callback - (optional) Function to be called when server response has
	//      been successfully processed.
	gallery.loadImages = function(arr, streams, count, olderThan, callback) {
		streams.forEach(function(id) {
			$http.get("api/stream/" +  id + "/contents?"
				+ (count ? "&count=" + count : "")
				+ (olderThan ? "&olderThan=" + olderThan : "")
			).then(
				function done(response) {
					alerts.remove("loadImages", "serverError");
					if (response.data.success) {
						response.data.images.forEach(function(image) {
							// Add this image's info to the target array
							arr.push({
								id: image.id,
								thumbUrl: "api/image/get/" + image.id + "?scaleTo=192&scaleMode=cover",
								url: "api/image/get/" + image.id,
								uploader: image.userLogin,
								uploadTime: image.uploadTime,
								comment: image.comment
							});

							// Record this image's ID into a separate
							// array, to make it quicker to identify
							// whether a given image ID is already known
							arr.ids.push(image.id);
						});

						// If a callback function was specified, call it
						if (callback) {
							callback();
						}
					}
				},
				function fail(response) {
					alerts.add("danger", "Server error loading images: " + response.status + " " + response.statusText, "loadImages", "serverError");
				}
			);
		});
	};

	// gallery.unloadImages()
	//
	//   Removes images from the end of a gallery.images array.
	//
	// Parameters:
	//   arr - An array object under gallery.images
	//   count - Number of images to unload
	gallery.unloadImages = function(arr, count) {
		for (var i = 0; i < count; i++) {
			arr.pop();
			arr.ids.pop();
		}
	};

	// gallery.loadMoreImages()
	//
	//   Load one more row of images into an expanded gallery. This should be
	//   called when the placeholder element at the bottom of the expanded
	//   gallery is visible and its scroll position is within the viewport.
	//
	// Parameters:
	//   arr - An array object under gallery.images
	//   callback - (optional) Function to be called when server response has
	//     been successfully processed.
	gallery.loadMoreImages = function(arr, callback) {
		// Only load more images if the gallery is expanded
		if (!arr.expanded) {
			return;
		}

		gallery.loadImages(arr, gallery.myStreams, gallery.numImagesPerRow, arr[arr.length - 1].uploadTime, function() {
			// angular-inview only triggers the in-view check one time when
			// the element enters or leaves the viewport.
			//
			// This means that even if the placeholder is still visible after
			// loading more images, gallery.loadMoreImages() doesn't get
			// called again because the placeholder won't be checked for
			// being in-view again until the next scroll event.
			//
			// We work around this limitation by artificially generating a
			// scroll event after a 0 ms timeout. The timer is guaranteed to
			// fire after the current closure is fully complete
			// (i.e. the DOM is rendered).
			$timeout(function() {
				angular.element(document).scroll();
			}, 0);

			if (callback) {
				callback();
			}
		});
	}

	// gallery.adjustImageRows()
	//
	//   Ensures that each row in the gallery grid contains a number of
	//   thumbnails equal to what will fit on a single row.
	//
	// Parameters:
	//   arr - An array object under gallery.images.
	gallery.adjustImageRows = function(arr) {
		// Check whether any blanks are left over on the last row of
		// thumbnails.
		var blanks = arr.length % gallery.numImagesPerRow;
		if (blanks != 0) {
			blanks = gallery.numImagesPerRow - blanks;
		}

		// If blanks are left over, and the gallery is expanded OR there
		// aren't currently enough images to fill the first row, load
		// more images to fill the blanks.
		if (blanks > 0 && (arr.expanded || arr.length < gallery.numImagesPerRow)) {
			gallery.loadImages(arr, gallery.myStreams, blanks, arr[arr.length - 1].uploadTime);
		}

		// If the gallery is collapsed, and the current number of
		// displayed images won't fit in the new width, unload the images
		// that won't fit.
		if (!arr.expanded) {
			gallery.unloadImages(arr, arr.length - gallery.numImagesPerRow);
		}

	}

	// Parameters:
	//   arr - An array object under gallery.images.
	gallery.collapseGrid = function(arr) {
		arr.expanded = false;
		gallery.adjustImageRows(arr);
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
		lsLightbox.setGallery(gallery);
		lsLightbox.openModal(arr, index);
	};

	// Watch the size of the gallery grid's element. We use this to calculate
	// how many image thumbnails can fit on a single row.
	//
	// Each thumbnail is 196px = 192px image + 4px margin-right.
	$scope.getElementDimensions = function() {
		return { 'h': $element.height(), 'w': $element.width() };
	};
	$scope.$watch($scope.getElementDimensions, function(newValue, oldValue) {
		gallery.numImagesPerRow = Math.floor(newValue.w / 196);
	}, true);
	angular.element(window).bind("resize", function() {
		$scope.$apply();
	});

	// If the number of images that will fit on a row has changed, ensure
	// that the number of images on each row matches the new width.
	$scope.$watch("gallery.numImagesPerRow", function(newValue, oldValue) {
		if (newValue != oldValue) {
			gallery.adjustImageRows(gallery.images.mine);
		}
	});

	// Functions to execute once the document is fully loaded.
	angular.element(document).ready(function() {
		// Begin keepalive timers
		keepalive.begin();
		// Load most recent images in streams on page load.
		gallery.loadImages(gallery.images.mine, gallery.myStreams, gallery.numImagesPerRow);
	});

	// Cancel keepalive timers when the app closes.
	$scope.$on("$destroy", function() {
		keepalive.end();
	});
}]);
