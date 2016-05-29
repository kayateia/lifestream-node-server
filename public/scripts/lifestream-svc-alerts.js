angular.module("LifeStreamAlerts", [ "ngAnimate", "ui.bootstrap" ]);

angular.module("LifeStreamAlerts").factory("lsAlerts", [ "$timeout", function($timeout) {
	var alerts = this;

	// Each property of this object is an Array or Object, representing the
	// contents of an alerts container.
	//
	// Each property of this object begins as an Array.
	// Arrays are similar to the following example:
	//   [
	//     {
	//       type: "danger",
	//       msg: "Message text",
	//       shown: true
	//     },
	//     ...
	//   ]
	//
	// When an alert identified by a unique key is passed to alerts.add(), the
	// Array is recreated as an Object.
	// Objects are similar to the following example:
	//   {
	//     keyName: {
	//       type: "danger",
	//       msg: "Message text",
	//       shown: true
	//     },
	//     ...
	//   }
	alerts.lists = {
		_global: []
	};

	// Count of the number of alerts in each container
	alerts.size = {
		_global: {
			total: 0,
			danger: 0,
			info: 0,
			success: 0,
			warning: 0
		}
	};

	// Keep track of whether a given alerts container is collapsed
	alerts.collapsed = {
		_global: false
	};

	// alerts.add()
	//
	//   Adds an alert of the given type with the given text. The alert may be
	//   identified by a unique key, and may be placed into a specific
	//   container.
	//
	// Parameters:
	//   type: The type of this alert. (danger, warning, info, success)
	//   msg: The text content of this alert.
	//   key (optional): A unique key to identify this alert. Subsequent calls
	//     to alerts.add() with this key will modify the existing alert instead
	//     of creating a new alert.
	//   container (optional): The name of the alert container, as specified in
	//     the <ls-alerts container="nameOfContainer"> attribute.
	alerts.add = function(type, msg, key, container) {
		// Default to global container if none specified
		if (!container) {
			container = "_global";
		}

		// Initialise container
		if (alerts.lists[container] === undefined) {
			if (key) {
				//alerts.lists[container] = new Map();
				alerts.lists[container] = new Object(null);
			}
			else {
				alerts.lists[container] = [];
			}
		}

		// Initialise size counter
		if (alerts.size[container] === undefined) {
			alerts.size[container] = {
				total: 0,
				danger: 0,
				info: 0,
				success: 0,
				warning: 0
			};
		}

		if (!key && alerts.lists[container] instanceof Array) {
			// Increment counts. Since no key was supplied, we know an existing
			// alert is not being replaced
			alerts.size[container].total++;
			alerts.size[container][type]++;

			// Push to array only if key is not specified, and the container
			// hasn't already been turned into an Object by a previous push of
			// a keyed alert
			alerts.lists[container].push({
				type: type,
				msg: msg,
				shown: true
			});
		}
		else if (key && alerts.lists[container] instanceof Array) {
			// Increment counts. Since the alerts list for this container is
			// currently an array, we know that this is the first keyed alert,
			// and therefore cannot be replacing an existing alert
			alerts.size[container].total++;
			alerts.size[container][type]++;

			// The container was an Array, but we have received a keyed alert,
			// so we need to convert it to a Map
			//var newMap = new Map();
			//alerts.lists[container].forEach(function(value, key) {
			//	newMap.set(key, value);
			//});
			//alerts.lists[container] = newMap;
			var newObj = new Object(null);
			alerts.lists[container].forEach(function(value, key) {
				newObj[key] = value;
			});
			alerts.lists[container] = newObj;

			// And insert the new alert
			//alerts.lists[container].set(key, {
			alerts.lists[container][key] = {
				type: type,
				msg: msg,
				shown: true
			//});
			};
		}
		//else if (key && alerts.lists[container] instanceof Map) {
		else if (key && !(alerts.lists[container] instanceof Array)) {
			// Increment counts if there is no existing alert with this key
			if (alerts.lists[container][key] === undefined) {
				alerts.size[container].total++;
				alerts.size[container][type]++;
			}
			// If the key does exist, but it's getting replaced by an alert of
			// a different type, adjust counts
			else if (alerts.lists[container][key].type != type) {
				alerts.size[container][alerts.lists[container][key].type]--;
				alerts.size[container][type]++;
			}
			// Otherwise, an existing alert is getting replaced with another
			// alert of the same type, and there is no need to adjust counts

			// If a key for this container was specified at any point during
			// its lifetime, it has been converted to a Map
			//alerts.lists[container].set(key, {
			alerts.lists[container][key] = {
				type: type,
				msg: msg,
				shown: true
			//});
			};
		}
		else {
			// Increment counts. No key was specified, so this alert cannot be
			// replacing an existing alert.
			alerts.size[container].total++;
			alerts.size[container][type]++;

			// If the container is a Map and no key was specified, generate a
			// key based on the current size of the Map.
			//var newKey = alerts.lists[container].size;
			var newKey = Object.keys(alerts.lists[container]).length;
			//while (alerts.lists[container].has(newKey)) {
			//	newKey++;
			//}
			//alerts.lists[container].set(newKey, {
			alerts.lists[container][newKey] = {
				type: type,
				msg: msg,
				shown: true
			//});
			};
			//alerts.size[container] = alerts.lists[container].size;
			alerts.size[container] = Object.keys(alerts.lists[container]).length;
		}
	};

	// alerts.remove()
	//
	//   Removes an alert.
	//
	// Parameters:
	//   index: a numeric index (if alert.lists[container] is an Array) or a
	//     unique key (if alerts.lists[container] has become an Object).
	//   contianer (optional): The container from which to remove this alert.
	alerts.remove = function(index, container) {
		// Default to global container if none specified
		if (!container) {
			container = "_global";
		}
		// Bail if container is not defined
		else if (alerts.lists[container] === undefined) {
			return;
		}

		// Only remove the message if it currently exists
		if (alerts.lists[container][index] !== undefined) {
			// Decrement counts
			alerts.size[container].total--;
			alerts.size[container][alerts.lists[container][index].type]--;

			// Remove alert from view (start animating)
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

	// alerts.clear()
	//
	//   Removes all alerts from a given container.
	//
	// Parameters:
	//   container (optional): The container from which to remove all alerts.
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
		alerts.size[container] = 0;
	}

	alerts.collapse = function(container) {
		// Default to global container if none specified
		if (!container) {
			container = "_global";
		}

		alerts.collapsed[container] = true;
	}

	alerts.expand = function(container) {
		// Default to global container if none specified
		if (!container) {
			container = "_global";
		}

		alerts.collapsed[container] = false;
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

	alertsCtrl.toggleCollapsed = function(container) {
		// Default to global container if none specified
		if (!container) {
			container = "_global";
		}

		if (alerts.collapsed[container]) {
			alerts.expand(container);
		}
		else {
			alerts.collapse(container);
		}
	};
}]);

angular.module("LifeStreamAlerts").directive("lsAlerts", function() {
	return {
		restrict: "E",
		controller: "LifeStreamAlertsController",
		controllerAs: "alertsCtrl",
		templateUrl: "partials/lifestream-alerts.html",
		scope: {
			collapsible: "@",
			container: "@",
			dismissOnTimeout: "@"
		},
		link: function(scope, element, attrs, controller) {
			if (attrs.container === undefined) {
				// Default to global container if none specified
				scope.container="_global";
			}

			if (attrs.dodge !== undefined) {
				angular.element(document).on("mousemove.alertsDodge." + scope.container, function(event) {
					element.find(".alert").each(function(index, found) {
						var rect = found.getBoundingClientRect();
						if (event.clientX > rect.left &&
							event.clientX < rect.right &&
							event.clientY > rect.top &&
							event.clientY < rect.bottom) {
							angular.element(found).addClass("translucent");
						}
						else {
							angular.element(found).removeClass("translucent");
						}
					});
				});
			}

			scope.$on("$destroy", function() {
				angular.element(document).off("mousemove.alertsDodge." + scope.container);
			});
		}
	};
});
