angular.module("LifeStreamWebApp").controller("LifeStreamAccountManager", [ "$scope", "$interval", "lsAlerts", "lsApi", "lsKeepAlive", "lsSession", function($scope, $interval, alerts, api, keepalive, session) {
	var formCtrl = this;

	// Expose session object to scope
	$scope.session = session;

	// Form properties definition
	formCtrl.form = {
		id: "accountForm",
		name: "accountForm",
		submitButtonText: "Save changes"
	};

	keepalive.begin();

	formCtrl.validateName = function(field) {
		var valid = false;

		// Seach for users with the same display name as that which was entered
		api.findUser(formCtrl.name, {
			id: "validateName"
		}).then(
			function(data) {
				var matched = false;

				data.users.forEach(function(user) {
					// If exact match is found in a different user's name,
					// form is invalid. Display name must be unique
					if (user.name == formCtrl.name && user.id != session.user.id) {
						matched = true;
					}
				});
				valid = !matched;
				field.$setValidity("exists", valid);

				if (valid) {
					alerts.remove("validateName", "persistent");
				}
				else {
					alerts.add("danger", "Display name must be unique", "validateName", "persistent");
				}
			}
		);
	};

	formCtrl.validateEmail = function(field) {
		// Nothing to do here; accept any value
		return;
	};

	formCtrl.validateNewPassword = function(field) {
		var valid = (formCtrl.newPassword == formCtrl.confirmPassword);
		if (valid) {
			alerts.remove("validateNewPassword", "persistent");
		}
		else {
			alerts.add("danger", "New passwords don't match", "validateNewPassword", "persistent");
		}
		formCtrl.modelCtrl.newPassword.$setValidity("passwordMismatch", valid);
		formCtrl.modelCtrl.confirmPassword.$setValidity("passwordMismatch", valid);
	};

	formCtrl.validateCurrentPassword = function(field) {
		// Nothing to do here; accept any value
		return;
	};

	formCtrl.submit = function() {
		api.updateUser(session.user.id, {
			name: formCtrl.name,
			email: formCtrl.email,
			password: formCtrl.password,
			oldPassword: formCtrl.oldPassword
		}, {
			id: "submitFunc",
			success: "Changes saved",
			error: "Error updating user: "
		});
	};

	// Form fields definition
	formCtrl.fields = [
		{
			id: "name",
			label: "Display name",
			required: true,
			type: "text",
			validator: formCtrl.validateName
		},
		{
			id: "email",
			label: "Email address",
			required: false,
			type: "email",
			validator: formCtrl.validateEmail
		},
		{
			id: "newPassword",
			help: "Leave blank to keep your current password",
			label: "New password",
			required: false,
			type: "password",
			validator: formCtrl.validateNewPassword
		},
		{
			id: "confirmPassword",
			label: "Re-type new password",
			required: false,
			type: "password",
			validator: formCtrl.validateNewPassword
		},
		{
			id: "oldPassword",
			help: "When changing your password, you must re-enter your current password",
			label: "Current password",
			required: false,
			type: "password",
			hiddenFromAdmin: true,
			validator: formCtrl.validateCurrentPassword
		}
	];

	// Wait until session.user is populated, then prefill form fields and focus
	// the form
	formCtrl.initLoadInterval = $interval(function() {
		if (session.user.id) {
				$interval.cancel(formCtrl.initLoadInterval);
				delete formCtrl.initLoadInterval;

				// Prepopulate fields
				formCtrl.name = session.user.name;
				formCtrl.email = session.user.email;

				// Focus the first form field
				$("input#name").focus();
		}
	}, 100);

	$scope.$on("destroy", function() {
		keepalive.end();
	});
}]);

angular.module("LifeStreamWebApp").controller("LifeStreamAccountDeletion", [ "$scope", "lsAlerts", "lsApi", "lsSession", "$timeout", function($scope, alerts, api, session, $timeout) {
	var formCtrl = this;

	// User must enter password to confirm deletion
	formCtrl.deletePassword = "";

	formCtrl.submit = function() {
		api.loginUser(session.user.login, formCtrl.deletePassword, {
			id: "submitFunc",
			error: "Could not delete account: "
		}).then(
			function(data) {
				api.deleteUser(session.user.id, {
					id: "submitFunc",
					success: "Your account has been deleted. You will now be logged out.",
					error: "Could not delete account: "
				}).then(
					function(data2) {
						$timeout(function() {
							session.logout("account_deleted");
						}, 5000);
					}
				);
			}
		);
	}
}]);
