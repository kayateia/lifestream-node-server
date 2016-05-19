angular.module("LifeStreamLightbox", [ "ui.bootstrap", "bootstrapLightbox" ]);

// Configure angular-bootstrap-lightbox for use by LifeStreamGalleryController
angular.module("LifeStreamLightbox").config(["LightboxProvider", function(LightboxProvider) {
	// Custom template (for comment display and editing functionality).
	LightboxProvider.templateUrl = "partials/lightbox.html";

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
angular.module("LifeStreamLightbox").controller("LifeStreamLightboxController", [ "$scope", "lsLightbox", function($scope, lsLightbox) {
	var lightboxCtrl = this;

	lightboxCtrl.Lightbox = lsLightbox.Lightbox; // angular-bootstrap-lightbox instance
	lightboxCtrl.gallery = lsLightbox.gallery; // LifeStreamGalleryController instance

	// Watch which image is currently focused in the Lightbox. By defaut, the
	// Lightbox wraps around to the first image when advancing past the last
	// image. This doesn't play nice with our infinitely scrolling gallery
	// because more images may be on the server, not yet loaded.
	//
	// The user should be able to keep advancing until they reach the last
	// available image on the server. To achieve that, we watch the index of
	// the currently focused image in the lightbox, and do additional
	// processing based on that.
	$scope.$watch("lightboxCtrl.Lightbox.index", function(newValue, oldValue) {
		// Nothing to do if:
		if (newValue === oldValue // values didn't actually change
			 || newValue == -1 // lightbox was closed, being shown now
			 || newValue == 1  // lightbox is being closed
			) {
			return;
		}

		var arr = lightboxCtrl.gallery.images.mine;
		// If the gallery is expanded and the user has reached the nth-last
		// image (where n is the number of images that'll fit on one row),
		// pre-load the next row.
		if (arr.expanded && newValue - arr.length < lightboxCtrl.gallery.numImagesPerRow) {
			lightboxCtrl.gallery.loadMoreImages(arr, function() {
				lightboxCtrl.Lightbox.setImages(arr);
			});
		}
		// If the galery is collased and the user has reached the first image
		// by wrapping around from the last image, expand the gallery and
		// load another row of images. Then focus on the first image from the
		// newly loaded row.
		else if (newValue == 0 && oldValue == arr.length - 1) {
			lightboxCtrl.gallery.expandGrid(arr, lightboxCtrl.gallery.myStreams);
			lightboxCtrl.gallery.loadMoreImages(arr, function() {
				lightboxCtrl.Lightbox.setImages(arr);
				lightboxCtrl.Lightbox.setImage(oldValue + 1);
			});
		}
	});
}]);
