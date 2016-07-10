describe("UserListController", function() {
	beforeEach(module("LifeStreamWebApp"));

	var $controller, $rootScope;

	beforeEach(inject(function(_$controller_, _$rootScope_) {
		$controller = _$controller_;
		$rootScope = _$rootScope_;
	}));

	describe("formCtrl.loadUsers", function() {
		it("gets a list of users from the server", function() {
			var $scope = $rootScope.$new();
			$scope.usermgr = $controller("LifeStreamUserManager", { $scope: $rootScope.$new() });
			var formCtrl = {};
			var controller = $controller("UserListController", {
				$scope: $scope,
				formCtrl: formCtrl
			});
			formCtrl.loadUsers();
			expect(formCtrl.users).not.toBe([]);
		});
	});
});
