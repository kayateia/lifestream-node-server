// Define the gallery controller
angular.module("LifeStreamGallery", [ "LifeStreamAlerts", "LifeStreamLightbox", "LifeStreamKeepAlive" ]);

angular.module("LifeStreamGallery").controller("LifeStreamGalleryController", ["$scope", "$element", "$http", "$interval", "lsAlerts", "lsApi", "lsLightbox", "lsKeepAlive", "$timeout", "$window", function($scope, $element, $http, $interval, alerts, api, lsLightbox, keepalive, $timeout, $window) {
	var gallery = this;

	// streamid from directive. May be a comma-separated list. Split the list
	// into an array, and keep only numeric IDs
	gallery.streams = [];
	$scope.streamid.split(",").forEach(function(value) {
		value = Number(value);
		if (!Number.isNaN(value)) {
			gallery.streams.push(value);
		}
	});

	// Thumbnail size from directive
	gallery.thumbSize = !Number.isNaN($scope.thumbSize) ? Number($scope.thumbSize) : 192;

	// .gallery-section container element
	gallery.element = $element.children(".gallery-section");
	// Offsets of .gallery-section container relative to document
	gallery.elementOffset = undefined;

	// Number of images that would fit each row in the gallery, taking into
	// account the width of the container element, the size of each thumbnail,
	// and the margin between each thumbnail. Updated by $scope.$watch()
	gallery.numImagesPerRow = 0;

	// gallery.images is an array of objects. Each element in the array is
	// intended to be populated by gallery.loadImages().
	//
	// Each element in the array is an object of the form:
	//   {
	//     id: image ID
	//     thumbUrl: URL of a thumbnail image
	//     url: URL to a corresponding full size image
	//     userid: user ID of the uploader
	//     userLogin: login of the uploader
	//     userName: display name of the uploader
	//     uploadTime: the time the image was uploaded (seconds since epoch)
	//     comment: a string that the uploader may optionally add
	//   }
	gallery.images = [];

	// True when the gallery is expanded
	gallery.expanded = false;

	// gallery.keepAlivePing()
	//
	//   Should be called whenever user activity is detected.
	gallery.keepAlivePing = function() {
		keepalive.ping();
	};

	// gallery.loadImageStreams()
	//
	//   Loads list of streams containing image. Populates the stream property
	//   of the specified image object with an array of stream objects.
	//
	// Parameters:
	//   image - image object
	gallery.loadImageStreams = function(image) {
		api.getImageStreams(image.id, {
			id: "loadImageStreams",
			error: "Couldn't get list of streams containing image: "
		}).then(
			function(data) {
				image.streams = data.streams;
			}
		);
	};

	// gallery.loadImages()
	//
	//   Loads a list of images from the server, from the specified streams.
	//   Each image ID is loaded into the grid exactly once; if the same image
	//   appears in multiple streams, the image itself will still appear Only
	//   once in the grid.
	//
	// Parameters:
	//   count - (optional) Number of images to load.
	//   olderThanId - (optional) Image ID. Only images with lower IDs will be
	//      loaded.
	//   callback - (optional) Function to be called when server response has
	//      been successfully processed.
	gallery.loadImages = function(count, olderThanId, callback) {
		$http.get("api/stream/" +  gallery.streams.join(",") + "/contents?"
			+ (count ? "&count=" + count : "")
			+ (olderThanId ? "&olderThanId=" + olderThanId : "")
		).then(
			function done(response) {
				alerts.remove("loadImages", "persistent");
				if (response.data.success) {
					response.data.images.forEach(function(image) {
						var image = {
							id: image.id,
							thumbUrl: "api/image/" + image.id + "?scaleTo=" + gallery.thumbSize + "&scaleMode=cover",
							url: "api/image/" + image.id,
							userid: image.userid,
							userLogin: image.userLogin,
							userName: image.userName,
							uploadTime: image.uploadTime,
							comment: image.comment
						};

						// Find out which streams contain this image
						gallery.loadImageStreams(image);

						// Add this image's info to the model
						gallery.images.push(image);
					});

					// If a callback function was specified, call it
					if (callback) {
						callback();
					}
				}
			},
			function fail(response) {
				alerts.add("danger", "Server error loading images: " + response.status + " " + response.statusText, "loadImages", "persistent");
			}
		);
	};

	// gallery.unloadImages()
	//
	//   Removes images from the end of a gallery.images array.
	//
	// Parameters:
	//   count - Number of images to unload
	gallery.unloadImages = function(count) {
		for (var i = 0; i < count; i++) {
			gallery.images.pop();
		}
	};

	// gallery.loadMoreImages()
	//
	//   Load one more row of images into an expanded gallery. This should be
	//   called when the placeholder element at the bottom of the expanded
	//   gallery is visible and its scroll position is within the viewport.
	//
	// Parameters:
	//   callback - (optional) Function to be called when server response has
	//     been successfully processed.
	gallery.loadMoreImages = function(callback) {
		// Only load more images if the gallery is expanded
		if (!gallery.expanded) {
			return;
		}

		gallery.loadImages(gallery.numImagesPerRow, gallery.images[gallery.images.length - 1].id, function() {
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
	gallery.adjustImageRows = function() {
		// Check whether any blanks are left over on the last row of
		// thumbnails.
		var blanks = gallery.images.length % gallery.numImagesPerRow;
		if (blanks != 0) {
			blanks = gallery.numImagesPerRow - blanks;
		}

		// If blanks are left over, and the gallery is expanded OR there
		// aren't currently enough images to fill the first row, load
		// more images to fill the blanks.
		if (blanks > 0 && (gallery.expanded || gallery.images.length < gallery.numImagesPerRow)) {
			gallery.loadImages(blanks, gallery.images[gallery.images.length - 1].id);
		}

		// If the gallery is collapsed, and the current number of
		// displayed images won't fit in the new width, unload the images
		// that won't fit.
		if (!gallery.expanded) {
			gallery.unloadImages(gallery.images.length - gallery.numImagesPerRow);
		}

	}

	// gallery.collapseGrid()
	//
	//   Collapses the gallery to show only one row.
	//
	// Parameters:
	//   $event (optional): Event object, for preventing click propagation
	gallery.collapseGrid = function($event) {
		if ($event) {
			$event.preventDefault();
		}

		gallery.expanded = false;
		gallery.adjustImageRows();

		// Scroll back to the top of this gallery on collapse
		$(window).scrollTop(gallery.element.offset().top);
	};

	// gallery.expandGrid()
	//
	//   Expands the gallery to show multiple rows.
	//
	// Parameters:
	//   callback (optional): Called wehen more images are loaded
	//   $event (optional): Event object, for preventing click propagation
	gallery.expandGrid = function(callback, $event) {
		if ($event) {
			$event.preventDefault();
		}

		gallery.expanded = true;
		gallery.loadMoreImages(callback);
	};

	// gallery.zoomImage()
	//
	//   Opens a lighbox to zoom in on the selected image
	//
	// Paramters:
	//   index - The index of the image within the array
	gallery.zoomImage = function(index) {
		lsLightbox.setGallery(gallery);
		lsLightbox.openModal(gallery.images, index);
	};

	// Watch the size of the gallery grid's element. We use this to calculate
	// how many image thumbnails can fit on a single row.
	//
	// Each thumbnail is gallery.thumbSize + 4px margin-right.
	$scope.getElementDimensions = function() {
		return { 'h': gallery.element.height(), 'w': gallery.element.width() };
	};
	$scope.$watch($scope.getElementDimensions, function(newValue, oldValue) {
		gallery.numImagesPerRow = Math.floor(newValue.w / (gallery.thumbSize + 4));
	}, true);
	angular.element(window).bind("resize", function() {
		$scope.$apply();
	});

	// If the number of images that will fit on a row has changed, ensure
	// that the number of images on each row matches the new width.
	$scope.$watch("gallery.numImagesPerRow", function(newValue, oldValue) {
		if (newValue != oldValue) {
			gallery.adjustImageRows();
		}
	});

	// Begin keepalive timers
	keepalive.begin();

	// Calculate appropriate placement for the affixed header of an expanded
	// gallery
	gallery.adjustAffixPosition = function() {
		// Obtain offset of gallery relative to document
		gallery.elementOffset = gallery.element.offset();

		// Activate affixing of header
		gallery.element.children("h2.expanded").affix({
			offset: {
				top: gallery.elementOffset.top
			}
		});
	};

	// After page is fully rendered and there is valid position and width for
	// the container element...
	$timeout(function() {
		// Load most recent images
		gallery.loadImages(gallery.numImagesPerRow, undefined, function() {
			// If the expanded attribute was set on the directive, expand the
			// gallery grid by default
			if ($element[0].attributes.expanded) {
				gallery.expandGrid();
			}
		});

		gallery.adjustAffixPosition();
	}, 0);

	// Recalculate where the gallery header should be affixed at regular
	// intervals; this is the best we can do without position:sticky.
	$interval(function() {
		gallery.adjustAffixPosition();
	}, 10000);


	// Cancel keepalive timers when the app closes.
	$scope.$on("$destroy", function() {
		keepalive.end();
	});
}]);

angular.module("LifeStreamGallery").directive("lsGallery", [ "$timeout", function($timeout) {
	return {
		controller: "LifeStreamGalleryController",
		controllerAs: "gallery",
		templateUrl: "partials/lifestream-gallery.html",
		scope: {
			expanded: '<',
			streamid: "@",
			thumbSize: "@",
			title: "@"
		}
	};
}]);
