angular.module("LifeStreamAlerts", [ "ngAnimate", "ui.bootstrap" ]);

angular.module("LifeStreamAlerts").factory("lsAlerts", [ "$timeout", function($timeout) {
	var alerts = this;

	alerts.lists = {
		_global: []
	};

	alerts.add = function(type, msg, key, container) {
		// Default to global container if none specified
		if (!container) {
			container = "_global";
		}

		if (!key && alerts.lists[container] instanceof Array) {
			// Push to array only if key is not specified, and the container
			// hasn't already been turned into an Object by a previous push of
			// a keyed alert.
			alerts.lists[container].push({
				type: type,
				msg: msg,
				shown: true
			});
		}
		else {
			alerts.lists[container][key] = {
				type: type,
				msg: msg,
				shown: true
			};
		}
	};

	alerts.remove = function(index, container) {
		// Default to global container if none specified
		if (!container) {
			container = "_global";
		}

		if (alerts.lists[container][index] !== undefined) {
			alerts.lists[container][index].shown = false;

			// Delete alert after animation finishes.
			$timeout(function() {
				if (alerts.lists[container] instanceof Array) {
					// Remove element from array
					alerts.lists[container].splice(index, 1);
				}
				else {
					// Delete object property
					delete alerts.lists[container][index];
				}
			}, 1000);
		}
	};

	alerts.clear = function(container) {
		// Default to global container if none specified
		if (!container) {
			container = "_global";
		}

		if (alerts.lists[container] instanceof Array) {
			// Iterate through array indeces
			alerts.lists[container].forEach(function(alert, index) {
				alerts.remove(index, container);
			});
		}
		else {
			// Iterate through object properties
			for (var property in alerts.lists[container]) {
				alerts.remove(property, container);
			}
		}
	}

	return alerts;
}]);

angular.module("LifeStreamAlerts").controller("LifeStreamAlertsController", [ "lsAlerts", "$scope", function(alerts, $scope) {
	var alertsCtrl = this;

	// Simply make the service bits accessible via the controller
	for (var property in alerts) {
		if (alerts.hasOwnProperty(property)) {
			alertsCtrl[property] = alerts[property];
		}
	};
}]);

angular.module("LifeStreamAlerts").directive("lsAlerts", function() {
	return {
		restrict: "E",
		controller: "LifeStreamAlertsController",
		controllerAs: "alerts",
		templateUrl: "partials/lifestream-alerts.html",
		scope: {
			container: "@",
			dismissOnTimeout: "@"
		},
		link: function(scope, element, attrs, controller) {
			if (attrs.container === undefined) {
				// Default to global container if none specified
				scope.container="_global";
			}
			else if (controller.lists[attrs.container] === undefined) {
				// Initialise named container
				controller.lists[attrs.container] = {};
			}

			if (attrs.fixed !== undefined) {
				element.children(".alerts-container").addClass("fixed");
			}
		}
	};
});
