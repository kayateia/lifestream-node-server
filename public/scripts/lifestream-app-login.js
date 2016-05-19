lsApp.controller("LoginController", [ "lsSession", function(session) {
	var loginController = this;

	loginController.login = function() {
		session.login(loginController.username, loginController.password, serverData.fromUrl);
	};
}]);
