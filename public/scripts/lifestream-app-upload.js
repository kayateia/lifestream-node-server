angular.module("LifeStreamWebApp").controller("LifeStreamUploadController", [ "$scope", "$filter", "$http", "$interval", "lsAlerts", "lsSession", "Upload", function($scope, $filter, $http, $interval, alerts, session, Upload) {
	var formCtrl = this;

	// Maximum total file size: 9 MB
	formCtrl.maxTotalSize = 9437184;

	// One array element per row on the input form
	formCtrl.fileInputs = [ null ];

	// True when upload is in progress
	formCtrl.isUploading = false;

	// Uploading progress per centage
	formCtrl.progress = 0;

	// Array of streams owned by the user
	formCtrl.streams = [];

	formCtrl.fileSelected = function($file) {
		// Add file to the model
		formCtrl.fileInputs[formCtrl.fileInputs.length - 1] = $file;

		// LifeStream currently supports uploading only one file at a time, so
		// there is no need to insert more file inputs
		//if (formCtrl.fileInputs[formCtrl.fileInputs.length - 1] !== null) {
		//	formCtrl.fileInputs.push(null);
		// }
	};

	formCtrl.filesDropped = function($files) {
		// LifeStream currently supports uploading only one file at a time, so
		// just select the first file from the array.
		formCtrl.fileSelected($files[0]);
		// Update the model and view as though each file were selected
		// individually
		//$files.forEach(function(file) {
		//	formCtrl.fileSelected(file);
		//});
	};

	formCtrl.removeFile = function($index, $event) {
		// Don't submit the form when link is clicked
		$event.preventDefault();

		// Remove file at specified index from model
		//formCtrl.fileInputs.splice($index, 1);
		// LifeStream currently supports uploading only one file at once, so
		// when removing a file, simply re-initialise the fileInputs array.
		formCtrl.fileInputs = [ null ];
	};

	formCtrl.upload = function() {
		var totalSize = 0;
		var files = [];
		var streamIds = [];

		// Examine files to be uploaded
		formCtrl.fileInputs.forEach(function(file) {
			// Skip any blank file selections
			if (file !== null) {
				files.push(file);
				// Tally total size of files to be uploaded
				totalSize += file.size;
			}
		});
		// Refuse upload if maximum size exceeded
		if (totalSize > formCtrl.maxTotalSize) {
			alert("Total size of all select files can't be greater than " + $filter("bytes")(formCtrl.maxTotalSize));
			return;
		}

		// Compile list of stream IDs
		formCtrl.streams.forEach(function(stream) {
			if (stream.checked) {
				streamIds.push(stream.id);
			}
		});

		formCtrl.isUploading = true;
		Upload.upload({
			url: "api/image",
			method: "POST",
			data: {
				files: files,
				// TODO: Currently, POST /api/image only supports a single
				//       stream ID even though the backend code can handle an
				//       array of IDs
				streamid: streamIds[0]
			}
		}).then(
			function done(response) {
				formCtrl.isUploading = false;
				formCtrl.progress = 0;
				if (response.data.success) {
					alerts.remove("upload", "persistent");
					alerts.add("success", files[0].name + ": uploaded successfully");

					// On successful upload, reset upload form
					formCtrl.fileInputs = [ null ];

					// If more than one stream was selected, the upload
					// operation would only have associated the image with the
					// first seleted stream.
					//
					// Make additional queries to associate the image with each
					// additional selected stream.
					streamIds.forEach(function(streamid, index) {
						// Image was already associated with the first selected
						// stream during the upload process.
						if (index == 0) {
							return;
						}

						// Get name of this stream, for error reporting
						var i, streamName;
						for (i = 0; i < formCtrl.streams.length; i++) {
							if (formCtrl.streams[i].id == streamid) {
								streamName = formCtrl.streams[i].name;
								break;
							}
						}

						// Associate newly uploaded image with stream
						$http.post(
							"api/image/" + response.data.id + "/streams",
							{
								streamid: streamid
							}
						).then(
							function done(response) {
								alerts.remove("uploadStreamAssoc", "persistent");
								if (!response.data.success) {
									alerts.add("danger", "Couldn't add image to " +  streamName + ": " + response.data.error, "uploadStreamAssoc", "persistent");

									// If server-side data couldn't be updated, revert model
									stream.associated = false;
								}
							},
							function fail(response) {
								alerts.add("danger", "Server error adding image to " + streamName + ": " + response.status + " " + response.statusText, "uploadStreamAssoc", "persistent");

								// If server-side data couldn't be updated, revert model
								stream.associated = false;
							}
						);
					});
				}
				else {
					alerts.add("danger", "Upload failed: " + response.data.error, "upload", "persistent");
				}
			},
			function fail(response) {
				formCtrl.isUploading = false;
				formCtrl.progress = 0;
			},
			function progress(evt) {
				formCtrl.progress = parseInt(100.0 * evt.loaded / evt.total) + "%";
			}
		);
	};

	formCtrl.loadStreams = function(userid) {
		$http.get("api/stream/list?userid=" + userid).then(
			function done(response) {
				alerts.remove("loadStreams", "persistent");
				if (response.data.success) {
					formCtrl.streams = response.data.streams;
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

	// Initialise page by loading information about the current user's
	// streams and subscriptions.
	//
	// Since session.user is populated asynchronously on page load, we
	// need to wait until session data is actually available before
	// attempting to load streams.
	formCtrl.initLoadInterval = $interval(function() {
		if (session.user.id) {
			$interval.cancel(formCtrl.initLoadInterval);
			delete formCtrl.initLoadInterval;

			// First, load streams owned by the current user
			formCtrl.loadStreams(session.user.id);
		}
	});
}]);

angular.module("LifeStreamWebApp").filter('bytes', function() {
	return function(bytes, precision) {
		if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) {
			return '-';
		}

		if (typeof precision === 'undefined') {
			precision = 1;
		}

		var units = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'];
		var number = Math.floor(Math.log(bytes) / Math.log(1024));

		return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) +  ' ' + units[number];
	}
});
