angular.module("LifeStreamWebApp").controller("LifeStreamNavbarController", [ "$scope", "lsSession", "$window", function($scope, session, $window) {
	var navbar = this;
	navbar.loginLabel = serverData.userid ? "Logout " + serverData.userLogin : "Login";
	navbar.page = ""; // name of the current page

	if (serverData.userid) {
		session.queryUserInfo(serverData.userid);
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
