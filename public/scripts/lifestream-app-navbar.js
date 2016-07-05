angular.module("LifeStreamWebApp").controller("LifeStreamNavbarController", [ "$scope", "lsSession", "$window", function($scope, session, $window) {
	var navbar = this;
	navbar.loginLabel = serverData.userid ? "Logout " + serverData.userLogin : "Login";
	navbar.page = ""; // name of the current page

	// If user is currently logged in, query server for details
	if (serverData.userid) {
		session.queryUserInfo(serverData.userid, function(err, user) {
			// Make those details available to the navbar template
			if (!err) {
				navbar.user = user;
			}
		});
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
