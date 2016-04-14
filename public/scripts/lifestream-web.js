angular.module('LifeStreamWeb', [])
	.controller('LoginController', function() {
		var loginController = this;

		loginController.login = function() {
			$.post("/api/user/login", {
					login: loginController.username,
					password: loginController.password
				})
				.done(function(data) {
					if (data.success) {
						Cookies.set("authorization", "Bearer " + data.token);
						window.location.replace("/login?reason=successful_login");
					}
					else {
						Cookies.remove("authorization");
						window.location.replace("/login?reason=failed_login&detail=" + encodeURIComponent(data.error));
					}
				})
				.fail(function(data) {
					alert("Request failed: " + JSON.stringify(data));
				});
		}
	});
