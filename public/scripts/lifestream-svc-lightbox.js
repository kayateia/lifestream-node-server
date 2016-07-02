angular.module("LifeStreamLightbox", [ "ui.bootstrap", "bootstrapLightbox", "LifeStreamSession" ]);

// Configure angular-bootstrap-lightbox for use by LifeStreamGalleryController
angular.module("LifeStreamLightbox").config(["LightboxProvider", function(LightboxProvider) {
	// Custom template (for comment display and editing functionality).
	LightboxProvider.templateUrl = "partials/lifestream-lightbox.html";

	// Our image caption property is called "comment".
	LightboxProvider.getImageCaption = function(image) {
		return image.comment;
	};

	// Increase the maximum display height of the image
	LightboxProvider.calculateImageDimensionLimits = function (dimensions) {
		return {
			// default behaviour for width
			'maxWidth': dimensions.windowWidth >= 768 ?
				dimensions.windowWidth - 92 :
				dimensions.windowWidth - 52,
			// custom height, since we don't show a navigation toolbar and
			// don't have to make room for it
			'maxHeight': dimensions.windowWidth >= 768 ?
				dimensions.windowHeight - 92 :
				dimensions.windowHeight - 52
		};
	};

	// Change the modal dialogue's height calculation, since we changed the
	// maximum display height of the image.
	LightboxProvider.calculateModalDimensions = function(dimensions) {
		var width = Math.max(400, dimensions.imageDisplayWidth + 32);

		if (width >= dimensions.windowWidth - 20 || dimensions.windowWidth < 768) {
			width = 'auto';
		}

		return {
			'width': width,		// default behaviour for width
			'height': 'auto'	// let height be determined automatically
		};
	};
}]);

// The service is a thin wrapper around angular-bootstrap-lightbox, mainly for
// allowing LifeStreamGalleryController to interact with and set some
// additional properties on the lightbox.
angular.module("LifeStreamLightbox").factory("lsLightbox", [ "Lightbox", function(Lightbox) {
	var lsLightbox = this;

	lsLightbox.Lightbox = Lightbox; // angular-bootstrap-lightbox instance
	lsLightbox.gallery = undefined; // LifeStreamGalleryController instance

	// A LifeStreamGalleryController instance needs to be passed in, in order
	// for the lightbox to interact with the gallery's image loading
	// functionality.
	lsLightbox.setGallery = function(gallery) {
		lsLightbox.gallery = gallery;
	};

	// Forward openModal unmodified to angular-bootstrap-lightbox
	lsLightbox.openModal = Lightbox.openModal;

	return lsLightbox;
}]);

// This controller manages the custom template's behaviour. It uses properties
// belonging to the service to communicate with both
// LifeStreamGalleryController and angular-bootstrap-lightbox.
angular.module("LifeStreamLightbox").controller("LifeStreamLightboxController", [ "$scope", "$http", "lsAlerts", "lsLightbox", "lsSession", "$timeout", function($scope, $http, alerts, lsLightbox, session, $timeout) {
	var lightboxCtrl = this;

	// true when comment editor is shown
	lightboxCtrl.commentFormShown = false;

	// true when stream association editor is shown
	lightboxCtrl.streamsFormShown = false;

	// true when the current image was uploaded by the logged-in user
	lightboxCtrl.isMyImage = false;

	// New comment is saved here from the comment editor form is saved here
	lightboxCtrl.newComment = "";

	// True if the list of streams containing the current image is expanded
	lightboxCtrl.streamsExpanded = false;

	// Array of streams belonging to the user. It becomes populated when the
	// user chooses to edit streams associated with an image
	lightboxCtrl.userStreams = [];

	// lightboxCtrl.delayedDismiss()
	//
	//   When clicking on a link whose ngClick event dismisses the lightbox,
	//   variables affecting the destination of the link may be unset before the
	//   browser navigates to the link. This function ensures that the browser
	//   attempts to navigate to the link before any lightbox variables are
	//   unset.
	lightboxCtrl.delayedDismiss = function() {
		$timeout(function() {
			$scope.$dismiss();
		}, 0);
	};

	lightboxCtrl.hideCommentForm = function() {
		lightboxCtrl.commentFormShown = false;
		lightboxCtrl.newComment = "";

		// Remove the event that caused clicking outside of the comment form to
		// hide it
		$(document).off("click.hideCommentForm");
		$("#commentInputGroup").off("click.stopPropagation");
	};

	lightboxCtrl.showCommentForm = function($event) {
		// Confirm that the uploader is the same as the current user
		if (lsLightbox.Lightbox.images[lsLightbox.Lightbox.index].userLogin == session.user.login) {
			lightboxCtrl.commentFormShown = true;

			// Pre-populate input field with current comment
			lightboxCtrl.newComment = lsLightbox.Lightbox.images[lsLightbox.Lightbox.index].comment;

			// Auto-focus the comment field after DOM is rendered
			$timeout(function() {
				$("#newComment").focus();
			}, 0);
			$event.stopPropagation();

			// Clicking anywhere outside of the comment form will close it, but
			// prevent clicking INSIDE the comment form from triggering a close
			$("#commentInputGroup").on("click.stopPropagation", function(event) {
				event.stopPropagation();
			});
			$(document).on("click.hideCommentForm", function() {
				lightboxCtrl.hideCommentForm();
			});
		}
	};

	lightboxCtrl.saveComment = function() {
		// Save lightboxCtrl.newComment for later use. By the time the server
		// responds to the request, the form would have been hidden and the old
		// value for lightboxCtrl.newComment would have been deleted.
		var newComment = lightboxCtrl.newComment;

		// Save new comment to the server
		$http.post("api/image/" + lsLightbox.Lightbox.images[lsLightbox.Lightbox.index].id + "/comment", {
			comment: newComment
		}).then(
			function done(response) {
				alerts.remove("saveComment", "persistent");
				if (response.data.success) {
					// Update the local data model
					lsLightbox.Lightbox.images[lsLightbox.Lightbox.index].comment = newComment;

					// Only hide comment form if save is successful
					lightboxCtrl.hideCommentForm();
				}
				else {
					alerts.add("danger", "Comment update failed: " + response.data.error);
				}
			},
			function fail(response) {
				alerts.add("danger", "Server error updating comment: " + response.status + " " + response.statusText, "saveComment", "persistent");
			}
		);
	};

	lightboxCtrl.expandStreams = function($event) {
		$event.preventDefault();
		lightboxCtrl.streamsExpanded = true;
	};

	lightboxCtrl.collapseStreams = function($event) {
		$event.preventDefault();
		lightboxCtrl.streamsExpanded = false;
	};

	lightboxCtrl.hideStreamsForm = function() {
		lightboxCtrl.streamsFormShown = false;

		// Remove the event that caused clicking outside of the streams form to
		// hide it
		$(document).off("click.hideStreamsForm");
		$("#streamsForm").off("click.stopPropagation");
	}

	// lightboxCtrl.isCurrentImageInStream()
	//
	//   Look for a stream object with the given ID within a given array, and
	//   return the array index of the object if one is found.
	//
	//   If no matching stream object is found, return -1.
	//
	// Parameters:
	//   id - stream ID
	//   arr - Array to search
	lightboxCtrl.findStreamIndex = function(id, arr) {
		var retval = -1;

		for (var i = 0; i < arr.length; i++) {
			if (arr[i].id == id) {
				retval = i;
				break;
			}
		}

		return retval;
	}

	lightboxCtrl.showStreamsForm = function() {
		// Confirm that the uploader is the same as the current user
		if (lsLightbox.Lightbox.images[lsLightbox.Lightbox.index].userLogin == session.user.login) {
			lightboxCtrl.streamsFormShown = true;

			$http.get("api/stream/list?userid=" + session.user.id).then(
				function done(response) {
					alerts.remove("showStreamsForm", "persistent");
					if (response.data.success) {
						// Clear userStreams array before repopulating it, or
						// there'll be duplicate streams each time the user
						// hides and reshows the form
						lightboxCtrl.userStreams = [];

						// For each stream in response...
						response.data.streams.forEach(function(stream) {
							// Check whether the current image is associated
							// with the stream
							var index = lightboxCtrl.findStreamIndex(stream.id, lsLightbox.Lightbox.images[lsLightbox.Lightbox.index].streams);

							lightboxCtrl.userStreams.push({
								id: stream.id,
								name: stream.name,
								permission: stream.permission,
								associated: index != -1
							});
						});

						// Clicking anywhere outside of the streams form will
						// close it, but prevent clicking INSIDE the streams
						// form from triggering a close
						$("#streamsForm").on("click.stopPropagation", function(event) {
							event.stopPropagation();
						});
						$(document).on("click.hideStreamsForm", function() {
							lightboxCtrl.hideStreamsForm();
						});
					}
					else {
						alerts.add("danger", "Couldn't list available streams: " + response.data.error);

						// Don't show streams form if listing is unsuccessful
						lightboxCtrl.hideStreamsForm();
					}
				},
				function fail(response) {
					alerts.add("danger", "Server error listing available streams: " + response.status + " " + response.statusText, "showStreamsForm", "persistent");

					// Don't show streams form if listing is unsuccessful
					lightboxCtrl.hideStreamsForm();
				}
			);
		}
	};

	lightboxCtrl.streamToggled = function(stream) {
		// true if server-side update is successful
		var successful = false;

		// Check whether current image is associated with the toggled stream
		var index = lightboxCtrl.findStreamIndex(stream.id, lsLightbox.Lightbox.images[lsLightbox.Lightbox.index].streams);

		// If the image's state of association with the toggled stream already
		// matches what the checkbox indicates, there's nothing to do
		if ((stream.associated && index != -1) ||
			!stream.associated && index == -1) {
			return;
		}

		// Otherwise, notify the server about the change in association
		if (stream.associated) {
			$http.post(
				"api/image/" + lsLightbox.Lightbox.images[lsLightbox.Lightbox.index].id + "/streams",
				{
					streamid: stream.id
				}
			).then(
				function done(response) {
					alerts.remove("streamToggled", "persistent");
					if (response.data.success) {
						successful = true;
						lsLightbox.Lightbox.images[lsLightbox.Lightbox.index].streams.push(stream);
						alerts.add("success", "Added image to " + stream.name);
					}
					else {
						alerts.add("danger", "Couldn't add image to stream: " + response.data.error);

						// If server-side data couldn't be updated, revert model
						stream.associated = false;
					}
				},
				function fail(response) {
					alerts.add("danger", "Server error adding image to stream: " + response.status + " " + response.statusText, "streamToggled", "persistent");

					// If server-side data couldn't be updated, revert model
					stream.associated = false;
				}
			);
		}
		else {
			$http.delete("api/image/" + lsLightbox.Lightbox.images[lsLightbox.Lightbox.index].id + "/streams?streamid=" + stream.id).then(
				function done(response) {
					alerts.remove("streamToggled", "persistent");
					if (response.data.success) {
						successful = true;
						lsLightbox.Lightbox.images[lsLightbox.Lightbox.index].streams.splice(index, 1);
						alerts.add("success", "Removed image from " + stream.name);
					}
					else {
						alerts.add("danger", "Couldn't remove image from stream: " + response.data.error);

						// If server-side data couldn't be updated, revert model
						stream.associated = true;
					}
				},
				function fail(response) {
					alerts.add("danger", "Server error removing image from stream: " + response.status + " " + response.statusText, "streamToggled", "persistent");

					// If server-side data couldn't be updated, revert model
					stream.associated = true;
				}
			);
		}
	}

	// Watch which image is currently focused in the Lightbox. By defaut, the
	// Lightbox wraps around to the first image when advancing past the last
	// image. This doesn't play nice with our infinitely scrolling gallery
	// because more images may be on the server, not yet loaded.
	//
	// The user should be able to keep advancing until they reach the last
	// available image on the server. To achieve that, we watch the index of
	// the currently focused image in the lightbox, and do additional
	// processing based on that.
	$scope.$watch("Lightbox.index", function(newValue, oldValue) {
		// Invalid state if lightbox has never been opened
		if (newValue === -1) {
			return;
		}

		// If any edit forms are shown, close them. The information from a
		// previous image's edit form is not necessarily correct for the current
		// image
		if (lightboxCtrl.commentFormShown) {
			lightboxCtrl.hideCommentForm();
		}
		if (lightboxCtrl.streamsFormShown) {
			lightboxCtrl.hideStreamsForm();
		}

		// Check if current image was uploaded by the logged-in user.
		//
		// This check has to come before the nothing-to-do check because
		// closing the lightbox sets the index to 1. Putting this check after
		// the nothing-to-do  check would therefore prevent the image at
		// index 1 from ever being recognised as belonging to the logged-in user
		lightboxCtrl.isMyImage = lsLightbox.gallery.images[newValue].userLogin == session.user.login;

		// Nothing more to do if:
		if (newValue === oldValue // values didn't actually change
			||newValue == 1 // lightbox is being closed
			) {
			return;
		}

		// If the gallery is expanded and the user has reached the nth-last
		// image (where n is the number of images that'll fit on one row),
		// pre-load the next row.
		if (lsLightbox.gallery.expanded && newValue - lsLightbox.gallery.images.length < lsLightbox.gallery.numImagesPerRow) {
			lsLightbox.gallery.loadMoreImages(function() {
				lsLightbox.Lightbox.setImages(lsLightbox.gallery.images);
			});
		}
		// If the galery is collased and the user has reached the first image
		// by wrapping around from the last image, expand the gallery and
		// load another row of images. Then focus on the first image from the
		// newly loaded row.
		else if (newValue == 0 && oldValue == lsLightbox.gallery.images.length - 1) {
			lsLightbox.gallery.expandGrid(function() {
				lsLightbox.Lightbox.setImages(lsLightbox.gallery.images);
				lsLightbox.Lightbox.setImage(oldValue + 1);
			});
		}
	});
}]);
