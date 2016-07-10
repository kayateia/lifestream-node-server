describe("UserListController", function() {
	beforeEach(module("LifeStreamWebApp"));

	var $controller;

	beforeEach(inject(function(_$controller_) {
		$controller = _$controller_;
	}));

	describe("formCtrl.loadUsers", function() {
		it("gets a list of users from the server", function() {
			var $scope = {};
			var formCtrl = {};
			var controller = $controller("UserListController", { $scope: $scope, formCtrl: formCtrl });
			formCtrl.loadUsers();
			expect(formCtrl.users).not.toBe([]);
		});
	});
});
