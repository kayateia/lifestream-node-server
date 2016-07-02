lsApp.controller("LifeStreamUserManager", [ "$scope", "lsAlerts", "$location", "$http", "lsKeepAlive", function($scope, alerts, $location, $http, keepalive) {
	var usermgr = this;

	usermgr.operations = [
		{
			name: "add",
			desc: "Add",
			url: "/user/add",
			active: true
		},
		{
			name: "edit",
			desc: "Edit",
			url: "/user/edit",
			active: false
		},
		{
			name: "del",
			desc: "Delete",
			url: "/user/del",
			active: false
		}
	];

	keepalive.begin();

	usermgr.keepAlivePing = function() {
		keepalive.ping();
	};

	usermgr.activateTab = function(name) {
		usermgr.operations.forEach(function(item) {
			if (item.name == name) {
				item.active = true;

				if ($location.path() != item.url) {
					$location.path(item.url);
				}
			}
			else {
				item.active = false;
			}
		});

		// Clear status alerts from the previous tab.
		alerts.remove("validateLoginIsNew", "persistent");
		alerts.remove("validateLoginExists", "persistent");
		alerts.remove("validatePassword", "persistent");
		alerts.remove("validateName", "persistent");
	};

	// Each validation function accepts a single argument from the template
	// that calls it. The argument is a FormController instance:
	//
	//   $scope.formName.inputName
	//
	// where formName is the value of the name attribute in the <form> tag,
	// and inputName is the value of the name attribute in the <input> tag.
	//
	// Since the template's scope is $scope, the event definition from the
	// template may simply look like:
	//
	//   <input ng-blur="validateLogin(formName.inputName)">
	//
	// The field's current value is accessible from the argument's $viewValue
	// property.
	//
	// The field's validity, as determined by the <input> tag's type
	// attribute, required attribute, and othes is accessible from the
	// argument's $valid property.
	usermgr.validateLoginIsNew = function(login) {
		// If local validation passes, check whether the user already exists
		// on the server side.
		if (login.$viewValue) {
			$http.get("api/user/login/" + login.$viewValue)
				.then(
					function done(response) {
						if (response.data.success) {
							alerts.add("danger", "User " + login.$viewValue + " already exists", "validateLoginIsNew", "persistent");
							login.$setValidity("exists", false);
						}
						else {
							alerts.remove("validateLoginIsNew", "persistent");
							login.$setValidity("exists", true);
						}
					},
					function fail(response) {
						alerts.add("danger", "Server error validating form: " + response.status + " " + response.statusText, "validateLoginIsNew", "persistent");
						login.$setValidity("server", false);
					}
				);
		}
		else {
			alerts.add("danger", "Login is required", "validateLoginIsNew", "persistent");
		}

		return login.$valid;
	};
	// Optional callback argument is for passing data from the server
	// response for further processing.
	usermgr.validateLoginExists = function(login, callback) {
		// If local validation passes, check whether the user already exists
		// on the server side.
		if (login.$viewValue) {
			$http.get("api/user/login/" + login.$viewValue)
				.then(
					function done(response) {
						if (response.data.success) {
							alerts.remove("validateLoginExists", "persistent");
							login.$setValidity("exists", true);

							if (callback) {
								callback(response.data);
							}
						}
						else {
							alerts.add("danger", "User " + login.$viewValue + " doesn't exist", "validateLoginExists", "persistent");
							login.$setValidity("exists", false);
						}
					},
					function fail(response) {
						alerts.add("danger", "Server error validating form: " + response.status + " " + response.statusText, "validateLoginExists", "persistent");
						login.$setValidity("server", false);
					}
				);
		}
		else {
			alerts.add("danger", "Login is required", "validateLoginExists", "persistent");
		}

		return login.$valid
	};
	usermgr.validatePassword = function(password) {
		if (password.$invalid) {
		 	if (password.$error.required) {
				alerts.add("danger", "Password is required", "validatePassword", "persistent");
			}
		}
		else {
			alerts.remove("validatePassword", "persistent");
		}

		return password.$valid;
	};
	usermgr.validateName = function(name) {
		if (name.$invalid) {
		 	if (name.$error.required) {
				alerts.add("danger", "Display name is required", "validateName", "persistent");
			}
		}
		else {
			alerts.remove("validateName", "persistent");
		}

		return name.$valid;
	};
	usermgr.validateEmail = function(email) {
		return email.$valid;
	};

	// Default to the add user tab if one wasn't specified in the URL.
	if (!$location.path()) {
		usermgr.activateTab("add");
	}

	$scope.$on("$destroy", function() {
		keepalive.end();
	});
}]);

lsApp.controller("UserAddController", ["$scope", "lsAlerts", "$http", function($scope, alerts, $http) {
	var usermgr = $scope.usermgr;
	var formCtrl = this;
	// Make this controller instance available to the template.
	$scope.formCtrl = formCtrl;
	// Reference to the form.FormController instance, to be initialised by
	// the template.
	formCtrl.modelCtrl = undefined;

	usermgr.activateTab("add");

	// Form properties definition
	$scope.formCtrl.form = {
		id: "usermgrForm",
		name: "usermgrForm",
		submitButtonText: "Create user"
	};

	// Form fields definition
	formCtrl.fields = [
		{
			id: "login",
			help: "User must not currently exist.",
			label: "Login",
			required: true,
			type: "text",
			validator: usermgr.validateLoginIsNew
		},
		{
			id: "password",
			label: "Password",
			required: true,
			type: "password",
			validator: usermgr.validatePassword
		},
		{
			id: "name",
			label: "Display name",
			required: true,
			type: "text",
			validator: usermgr.validateName
		},
		{
			id: "email",
			label: "Email address",
			required: false,
			type: "email",
			validator: usermgr.validateEmail
		},
		{
			id: "isAdmin",
			label: "Is admin?",
			required: false,
			type: "checkbox"
		}
	];

	formCtrl.submit = function() {
		$http.post("api/user", {
			login: formCtrl.login,
			password: formCtrl.password,
			name: formCtrl.name,
			email: formCtrl.email,
			isAdmin: formCtrl.isAdmin
		}).then(
			function done(response) {
				if (response.data.success) {
					alerts.add("success", "User " + formCtrl.login + " successfully created", "submitFunc", "persistent");
				}
				else {
					alerts.add("danger", "User " + formCtrl.login + " could not be created: " + response.data.error, "submitFunc", "persistent");
				}
			},
			function fail(response) {
				alerts.add("danger", "Server error creating user: " + response.status + " " + response.statusText, "submitFunc", "persistent");
			}
		);
	};
}]);

lsApp.controller("UserEditController", ["$scope", "lsAlerts", "$http", function($scope, alerts, $http) {
	var usermgr = $scope.usermgr;
	var formCtrl = this;
	// Make this controller instance available to the template.
	$scope.formCtrl = formCtrl;
	// Reference to the form.FormController instance, to be initialised by
	// the template.
	formCtrl.modelCtrl = undefined;

	usermgr.activateTab("edit");

	formCtrl.autofillForm = function(login) {
		usermgr.validateLoginExists(login, function(data) {
			// Prefill edit form info based on user info from server.
			formCtrl.name = data.name;
			formCtrl.email = data.email;
			formCtrl.isAdmin = data.isAdmin ? true : false;
			formCtrl.userid = data.id;
		});
	};

	// Form properties definition
	$scope.formCtrl.form = {
		id: "usermgrForm",
		name: "usermgrForm",
		submitButtonText: "Edit user"
	};

	// Form fields definition
	formCtrl.fields = [
		{
			id: "login",
			help: "User must already exist.",
			label: "Login",
			required: true,
			type: "text",
			validator: formCtrl.autofillForm
		},
		{
			id: "password",
			help: "Leave blank to keep the current password.",
			label: "Password",
			required: false,
			type: "password",
			validator: usermgr.validatePassword
		},
		{
			id: "name",
			label: "Display name",
			required: true,
			type: "text",
			validator: usermgr.validateName
		},
		{
			id: "email",
			label: "Email address",
			required: false,
			type: "email",
			validator: usermgr.validateEmail
		},
		{
			id: "isAdmin",
			label: "Is admin?",
			required: false,
			type: "checkbox"
		},
		{
			id: "userid",
			type: "hidden"
		}
	];

	formCtrl.submit = function() {
		$http.put("api/user/" + formCtrl.userid, {
			password: formCtrl.password,
			name: formCtrl.name,
			email: formCtrl.email,
			isAdmin: formCtrl.isAdmin
		}).then(
			function done(response) {
				if (response.data.success) {
					alerts.add("success", "User " + formCtrl.login + " successfully updated", "submitFunc", "persistent");
				}
				else {
					alerts.add("danger", "User " + formCtrl.login + " could not be updated: " + response.data.error, "submitFunc", "persistent");
				}
			},
			function fail(response) {
				alerts.add("danger", "Server error updating user: " + response.status + " " + response.statusText, "submitFunc", "persistent");
			}
		);
	};
}]);

lsApp.controller("UserDelController", [ "$scope", "lsAlerts", "$http", function($scope, alerts, $http) {
	var usermgr = $scope.usermgr;
	var formCtrl = this;
	// Make this controller instance available to the template.
	$scope.formCtrl = formCtrl;
	// Reference to the form.FormController instance, to be initialised by
	// the template.
	formCtrl.modelCtrl = undefined;

	usermgr.activateTab("del");

	// Form properties definition
	$scope.formCtrl.form = {
		id: "usermgrForm",
		name: "usermgrForm",
		submitButtonText: "Delete user"
	};

	// Form fields definition
	formCtrl.fields = [
		{
			id: "login",
			help: "User must already exist.",
			label: "Login",
			required: true,
			type: "text",
			validator: usermgr.validateLoginExists
		}
	];

	formCtrl.submit = function() {
		$http.get("api/user/login/" + formCtrl.login).then(
			function done(response) {
				if (response.data.success) {
					alerts.remove("submitFunc", "persistent");
					$http.delete("api/user/" + response.data.id).then(
						function done(response) {
							if (response.data.success) {
								alerts.add("success", "User " + formCtrl.login + " successfully deleted", "submitFunc", "persistent");
							}
							else {
								alerts.add("danger", "User " + formCtrl.login + " could not be deleted: " + response.data.error, "submitFunc", "persistent");
							}
						},
						function fail(response) {
							alerts.add("danger", "Server error deleting user: " + response.status + " " + response.statusText, "submitFunc", "persistent");
						}
					);
				}
				else {
					alerts.add("danger", "User " + formCtrl.login + " could not be deleted: " + response.data.error, "submitFunc", "persistent");
				}
			},
			function fail(response) {
				alerts.add("danger", "Server error getting user ID: " + response.status + " " + response.statusText, "submitFunc", "persistent");
			}
		);
	};
}]);

lsApp.config([ "$routeProvider", function($routeProvider) {
	$routeProvider
		.when("/user/add", {
			controller: "UserAddController",
			templateUrl: "./partials/horizontal-form.html"
		})
		.when("/user/edit", {
			controller: "UserEditController",
			templateUrl: "./partials/horizontal-form.html"
		})
		.when("/user/del", {
			controller: "UserDelController",
			templateUrl: "./partials/horizontal-form.html"
		})
		.otherwise("/user/add");
}]);
