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
								text: "User already exists."
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

	usermgr.activateTab("add");

	$scope.$on("$destroy", function() {
		keepalive.end();
	});
}]);

lsApp.controller("UserAddController", ["$scope", "$http", function($scope, $http) {
	var usermgr = $scope.usermgr;
	var formCtrl = this;

	usermgr.activateTab("add");

	formCtrl.fields = [
		{
			id: "login",
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
		}
	];

	formCtrl.submit = function() {
		$http.post("/api/user/info/" + formCtrl.login, {
			password: formCtrl.password,
			name: formCtrl.name,
			email: formCtrl.email
		}).then(
			function done(response) {
				if (response.data.success) {
					usermgr.messages.submitAdd = {
						type: "success",
						text: "User " + formCtrl.login + " successfully created."
					};
				}
				else {
					usermgr.messages.submitAdd = {
						type: "danger",
						text: "User " + formCtrl.login + " could not be created: " + response.data.error
					}
				}
			},
			function fail(response) {
				usermgr.messages.submitAdd = {
					type: "danger",
					text: "Server error: " + response.status + " " + response.statusText
				}
			}
		);
	};
}]);

lsApp.controller("UserEditController", ["$scope", function($scope) {
	var usermgr = $scope.usermgr;
	var formCtrl = this;

	usermgr.activateTab("edit");

	formCtrl.validate = function() {
		alert("Edit form validation");
	}
}]);

lsApp.controller("UserDelController", [ "$scope", function($scope) {
	var usermgr = $scope.usermgr;
	var formCtrl = this;

	usermgr.activateTab("del");

	formCtrl.validate = function() {
		alert("Delete form validation");
	}
}]);

lsApp.config([ "$routeProvider", function($routeProvider) {
	$routeProvider
		.when("/user/add", {
			templateUrl: "./partials/usermgr-add.html"
		})
		.when("/user/edit", {
			templateUrl: "./partials/usermgr-edit.html"
		})
		.when("/user/del", {
			templateUrl: "./partials/usermgr-del.html"
		});
}]);
