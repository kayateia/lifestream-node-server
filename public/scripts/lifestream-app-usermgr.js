lsApp.controller("LifeStreamUserManager", [ "$scope", "$location", "$http", "lsKeepAlive", function($scope, $location, $http, keepalive) {
	var usermgr = this;

	usermgr.messages = {};
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

		// Clear status messages from the previous tab.
		usermgr.messages = {};
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
			$http.get("/api/user/info/" + login.$viewValue)
				.then(
					function done(response) {
						if (response.data.success) {
							usermgr.messages.validateLoginIsNew = {
								type: "danger",
								text: "User " + login.$viewValue + " already exists."
							}
							login.$setValidity("exists", false);
						}
						else {
							delete usermgr.messages.validateLoginIsNew;
							login.$setValidity("exists", true);
						}
					},
					function fail(response) {
						usermgr.messages.validateLoginIsNew = {
							type: "danger",
							text: "Server error: " + response.status + " " + response.statusText
						}
						login.$setValidity("server", false);
					}
				);
		}
		else {
			usermgr.messages.validateLoginIsNew = {
				type: "danger",
				text: "Username is required."
			}
		}

		return login.$valid;
	};
	// Optional callback argument is for passing data from the server
	// response for further processing.
	usermgr.validateLoginExists = function(login, callback) {
		// If local validation passes, check whether the user already exists
		// on the server side.
		if (login.$viewValue) {
			$http.get("/api/user/info/" + login.$viewValue)
				.then(
					function done(response) {
						if (response.data.success) {
							delete usermgr.messages.validateLoginIsNew;
							login.$setValidity("exists", true);

							if (callback) {
								callback(response.data);
							}
						}
						else {
							usermgr.messages.validateLoginIsNew = {
								type: "danger",
								text: "User " + login.$viewValue + " doesn't exist."
							}
							login.$setValidity("exists", false);
						}
					},
					function fail(response) {
						usermgr.messages.validateLoginIsNew = {
							type: "danger",
							text: "Server error: " + response.status + " " + response.statusText
						}
						login.$setValidity("server", false);
					}
				);
		}
		else {
			usermgr.messages.validateLoginIsNew = {
				type: "danger",
				text: "Username is required."
			}
		}

		return login.$valid
	};
	usermgr.validatePassword = function(password) {
		if (password.$invalid) {
		 	if (password.$error.required) {
				usermgr.messages.validatePassword = {
					type: "danger",
					text: "Password is required."
				}
			}
		}
		else {
			delete usermgr.messages.validatePassword;
		}

		return password.$valid;
	};
	usermgr.validateName = function(name) {
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

lsApp.controller("UserAddController", ["$scope", "$http", function($scope, $http) {
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
			label: "Name",
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
			id: "isadmin",
			label: "Is admin?",
			required: false,
			type: "checkbox"
		}
	];

	formCtrl.submit = function() {
		$http.post("/api/user/info/" + formCtrl.login, {
			password: formCtrl.password,
			name: formCtrl.name,
			email: formCtrl.email,
			isadmin: formCtrl.isadmin
		}).then(
			function done(response) {
				if (response.data.success) {
					usermgr.messages.submitFunc = {
						type: "success",
						text: "User " + formCtrl.login + " successfully created."
					};
				}
				else {
					usermgr.messages.submitFunc = {
						type: "danger",
						text: "User " + formCtrl.login + " could not be created: " + response.data.error
					}
				}
			},
			function fail(response) {
				usermgr.messages.submitFunc = {
					type: "danger",
					text: "Server error: " + response.status + " " + response.statusText
				}
			}
		);
	};
}]);

lsApp.controller("UserEditController", ["$scope", "$http", function($scope, $http) {
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
			formCtrl.isadmin = data.isadmin ? true : false;
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
			label: "Name",
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
			id: "isadmin",
			label: "Is admin?",
			required: false,
			type: "checkbox"
		}
	];

	formCtrl.submit = function() {
		$http.put("/api/user/info/" + formCtrl.login, {
			password: formCtrl.password,
			name: formCtrl.name,
			email: formCtrl.email,
			isadmin: formCtrl.isadmin
		}).then(
			function done(response) {
				if (response.data.success) {
					usermgr.messages.submitFunc = {
						type: "success",
						text: "User " + formCtrl.login + " successfully updated."
					};
				}
				else {
					usermgr.messages.submitFunc = {
						type: "danger",
						text: "User " + formCtrl.login + " could not be created: " + response.data.error
					}
				}
			},
			function fail(response) {
				usermgr.messages.submitFunc = {
					type: "danger",
					text: "Server error: " + response.status + " " + response.statusText
				}
			}
		);
	};
}]);

lsApp.controller("UserDelController", [ "$scope", "$http", function($scope, $http) {
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
		$http.delete("/api/user/info/" + formCtrl.login, {}).then(
			function done(response) {
				if (response.data.success) {
					usermgr.messages.submitFunc = {
						type: "success",
						text: "User " + formCtrl.login + " successfully deleted."
					};
				}
				else {
					usermgr.messages.submitFunc = {
						type: "danger",
						text: "User " + formCtrl.login + " could not be deleted: " + response.data.error
					}
				}
			},
			function fail(response) {
				usermgr.messages.submitFunc = {
					type: "danger",
					text: "Server error: " + response.status + " " + response.statusText
				}
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
		});
}]);
