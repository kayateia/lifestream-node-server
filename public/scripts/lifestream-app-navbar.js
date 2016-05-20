lsApp.controller("LifeStreamNavbarController", [ "$scope", "lsSession", "$window", function($scope, session, $window) {
	var navbar = this;
	navbar.loginLabel = serverData.userLogin ? "Logout " + serverData.userLogin : "Login";
	navbar.page = ""; // name of the current page

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

	navbar.page = $window.location.pathname.substring($window.location.pathname.lastIndexOf("/"));
}]);
