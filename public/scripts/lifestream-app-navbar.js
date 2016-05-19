lsApp.controller("LifeStreamNavbarController", [ "$scope", "lsSession", "$window", function($scope, session, $window) {
	var navbar = this;
	navbar.loginLabel = serverData.userLogin ? "Logout" : "Login";

	if (serverData.userLogin) {
		session.queryUserInfo(serverData.userLogin);
	}

	navbar.toggleLogin = function() {
		if (serverData.userLogin) {
			session.logout();
		}
		else {
			$window.location.replace("login");
		}
	}
}]);
