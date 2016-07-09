angular.module("LifeStreamWebApp").controller("LifeStreamUserManager", [ "$scope", "lsAlerts", "lsApi", "$location", "lsKeepAlive", function($scope, alerts, api, $location, keepalive) {
	var usermgr = this;

	usermgr.operations = [
		{
			name: "list",
			desc: "List",
			url: "/user/list",
			active: true
		},
		{
			name: "add",
			desc: "Add",
			url: "/user/add",
			active: false
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

	usermgr.activateTab = function(name, args) {
		usermgr.operations.forEach(function(item) {
			if (item.name == name) {
				item.active = true;

				if (!$location.path().startsWith(item.url)) {
					$location.path(item.url + (args ? "/" + args : ""));
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
			api.getUserByLogin(login.$viewValue, {
				id: "validateLoginIsNew",
				persistent: true
			}).then(
				function(data) {
					// Validation is unsuccessful if user already exists
					alerts.add("danger", "User " + login.$viewValue + " already exists", "validateLoginIsNew", "persistent")
					login.$setValidity("exists", false);
				},
				function(err) {
					// If request failed due to an application error, user
					// doesn't exist and validation is successful.
					//
					// If the request failed due to a server error, validation
					// is unsuccessful.
					login.$setValidity("exists", err.data ? true : false);
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
			api.getUserByLogin(login.$viewValue, {
				id: "validateLoginExists",
				error: "Couldn't validate user: ",
				persistent: true
			}).then(
				function(data) {
					// If we got a valid response from the server, the login
					// corresponds to an existing user and validation is
					// successful
					login.$setValidity("exists", true);
					if (callback) {
						callback(null, data);
					}
				},
				function(err) {
					// If we received an invalid response from the server,
					// validation is not succesful.
					login.$setValidity("exists", false);
					if (callback && err.data) {
						// The callback is only interested in application
						// errors, not server errors
						callback(err.data.error);
					}
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

	$scope.$on("$destroy", function() {
		keepalive.end();
	});
}]);

angular.module("LifeStreamWebApp").controller("UserListController", [ "$scope", "lsAlerts", "lsApi", function($scope, alerts, api) {
	var usermgr = $scope.usermgr;
	var formCtrl = this;

	// Make this controller instance available to the template.
	$scope.formCtrl = formCtrl;

	// List of users
	formCtrl.users = [];

	// Property by which to sort the user list
	formCtrl.sortProperty = "id";

	// Direction by which to sort the user list
	formCtrl.reverseSort = false;

	usermgr.activateTab("list");

	formCtrl.sort = function() {
		formCtrl.users.sort(function(a, b) {
			if (a[formCtrl.sortProperty] < b[formCtrl.sortProperty]) {
				return formCtrl.reverseSort ? 1 : -1;
			}
			else if (a[formCtrl.sortProperty] > b[formCtrl.sortProperty]) {
				return formCtrl.reverseSort ? -1 : 1;
			}
			else {
				return 0;
			}
		});
	}

	formCtrl.loadUsers = function() {
		api.findUser("%", {
			id: "loadUsers",
			error: "Error retrieving list of users: "
		}).then(
			function(data) {
				formCtrl.users = data.users;

				// Sort the user list
				formCtrl.sort();
			}
		);
	};

	formCtrl.setSortOrder = function(property) {
		if (formCtrl.sortProperty == property) {
			formCtrl.reverseSort = !formCtrl.reverseSort;
		}
		else {
			formCtrl.reverseSort = false;
			formCtrl.sortProperty = property;
		}
	};

	$scope.$watch("formCtrl.sortProperty", function(newValue, oldValue) {
		if (newValue !== oldValue) {
			formCtrl.sort();
		}
	});

	$scope.$watch("formCtrl.reverseSort", function(newValue, oldValue) {
		if (newValue !== oldValue) {
			formCtrl.sort();
		}
	});

	// Initialise page by loading list of users
	formCtrl.loadUsers();
}]);

angular.module("LifeStreamWebApp").controller("UserAddController", ["$scope", "lsAlerts", "lsApi", function($scope, alerts, api) {
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
		api.createUser({
			login: formCtrl.login,
			password: formCtrl.password,
			name: formCtrl.name,
			email: formCtrl.email,
			isAdmin: formCtrl.isAdmin
		}, {
			id: "submitFunc",
			success: "User " + formCtrl.login + " successfully created",
			error: "User " + formCtrl.login + " could not be created: ",
			persistent: true
		}).then(
			function(data) {
				// If user creation is successful, also create a stream for the
				// new user
				api.createStream({
					userid: data.id,
					name: formCtrl.name + "'s Stream",
					permission: 1
				}, {
					id: "submitFunc2",
					success: "Created stream for " + formCtrl.login,
					error: "Could not create stream for " + formCtrl.login
				});
			}
		);
	};
}]);

angular.module("LifeStreamWebApp").controller("UserEditController", ["$scope", "lsAlerts", "lsApi", "$routeParams", "$timeout", function($scope, alerts, api, $routeParams, $timeout) {
	var usermgr = $scope.usermgr;
	var formCtrl = this;
	// Make this controller instance available to the template.
	$scope.formCtrl = formCtrl;
	// Reference to the form.FormController instance, to be initialised by
	// the template.
	formCtrl.modelCtrl = undefined;

	usermgr.activateTab("edit");

	formCtrl.autofillForm = function(login) {
		// As soon as username is changed, invalidate all fields until updated
		// response is received from the server
		formCtrl.name = "";
		formCtrl.email = "";
		formCtrl.isAdmin = false;

		usermgr.validateLoginExists(login, function(err, data) {
			if (!err) {
				// Prefill edit form info based on user info from server.
				formCtrl.name = data.name;
				formCtrl.email = data.email;
				formCtrl.isAdmin = data.isAdmin ? true : false;
			}
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
			help: "If you are editing your own account, this option is ignored",
			label: "Is admin?",
			required: false,
			type: "checkbox"
		}
	];

	formCtrl.submit = function() {
		api.getUserByLogin(formCtrl.login, {
			id: "submitFunc",
			error: "User " + formCtrl.login + " could not be updated: ",
			persistent: true
		}).then(
			function(data) {
				api.updateUser(data.id, {
					password: formCtrl.password,
					name: formCtrl.name,
					email: formCtrl.email,
					isAdmin: formCtrl.isAdmin
				}, {
					id: "submitFunc",
					success: "User " + formCtrl.login + " successfully updated",
					error: "User " + formCtrl.login + " could not be updated: ",
					persistent: true
				});
			}
		);
	};

	// If login was specified in path, pre-fill the form
	if ($routeParams.login) {
		formCtrl.login = $routeParams.login;

		// Execute the form auto-fill function after ngInit has had a chance to
		// associate formCtrl.modelCtrl with the form object
		$timeout(function() {
			formCtrl.autofillForm(formCtrl.modelCtrl.login);
		}, 0);
	}
}]);

angular.module("LifeStreamWebApp").controller("UserDelController", [ "$scope", "lsAlerts", "lsApi", "$routeParams", function($scope, alerts, api, $routeParams) {
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
		api.getUserByLogin(formCtrl.login, {
			id: "submitFunc",
			error: "User " + formCtrl.login + " could not be deleted: ",
			persistent: true
		}).then(
			function(data) {
				api.deleteUser(data.id, {
					id: "submitFunc",
					success: "User " + formCtrl.login + " successfully deleted",
					error: "User " + formCtrl.login + " could not be deleted: ",
					persistent: true
				});
			}
		);
	};

	// If login was specified in path, pre-fill the form
	formCtrl.login = $routeParams.login ? $routeParams.login : "";
}]);

angular.module("LifeStreamWebApp").config([ "$routeProvider", function($routeProvider) {
	$routeProvider
		.when("/user/list", {
			controller: "UserListController",
			templateUrl: "./partials/user-list.html"
		})
		.when("/user/add", {
			controller: "UserAddController",
			templateUrl: "./partials/horizontal-form.html"
		})
		.when("/user/edit", {
			controller: "UserEditController",
			templateUrl: "./partials/horizontal-form.html"
		})
		.when("/user/edit/:login", {
			controller: "UserEditController",
			templateUrl: "./partials/horizontal-form.html"
		})
		.when("/user/del", {
			controller: "UserDelController",
			templateUrl: "./partials/horizontal-form.html"
		})
		.when("/user/del/:login", {
			controller: "UserDelController",
			templateUrl: "./partials/horizontal-form.html"
		})
		.otherwise("/user/list");
}]);
