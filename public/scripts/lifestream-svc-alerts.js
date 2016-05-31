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

	// If alerts container is collapsible and collapsed, but new alerts should
	// be temporarily shown before being collapsed like the rest, this value is
	// the duration for which new alerts should be temporarily shown
	alerts.collapseOnTimeout = {
		_global: 0
	}

	// Structured similarly to alerts.list, this object holds temporary alerts
	// affected by collapseOnTimeout.
	//
	// Alerts are added to this stack automatically as needed by alerts.add(),
	// and removed automatically as needed by the template.
	//
	// Alerts added to or removed from this stack have no effect on alerts.size,
	// and no effect on alerts in the regular stack.
	alerts.pendingCollapse = {
		_global: []
	}

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
	//   pendingCollapse (optional): Add message to the pendingCollapse stack
	//     instead of the regular stack
	alerts.add = function(type, msg, key, container, pendingCollapse) {
		var arr;

		// Default to global container if none specified
		if (!container) {
			container = "_global";
		}

		// Is this message for the pendingCollapse stack?
		arr = pendingCollapse ? alerts.pendingCollapse : alerts.lists;

		// Initialise container
		if (arr[container] === undefined) {
			if (key) {
				//arr[container] = new Map();
				arr[container] = new Object(null);
			}
			else {
				arr[container] = [];
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

		if (!key && arr[container] instanceof Array) {
			if (!pendingCollapse) {
				// Increment counts. Since no key was supplied, we know an
				// existing alert is not being replaced
				alerts.size[container].total++;
				alerts.size[container][type]++;
			}

			// Push to array only if key is not specified, and the container
			// hasn't already been turned into an Object by a previous push of
			// a keyed alert
			arr[container].push({
				type: type,
				msg: msg,
				shown: true
			});

			// Array index for latest alert
			key = arr[container].length - 1;
		}
		else if (key && arr[container] instanceof Array) {
			if (!pendingCollapse) {
				// Increment counts. Since the alerts list for this container is
				// currently an array, we know that this is the first keyed
				// alert, and therefore cannot be replacing an existing alert
				alerts.size[container].total++;
				alerts.size[container][type]++;
			}

			// The container was an Array, but we have received a keyed alert,
			// so we need to convert it to a Map
			//var newMap = new Map();
			//arr[container].forEach(function(value, key) {
			//	newMap.set(key, value);
			//});
			//arr[container] = newMap;
			var newObj = new Object(null);
			arr[container].forEach(function(value, key) {
				newObj[key] = value;
			});
			arr[container] = newObj;

			// And insert the new alert
			//arr[container].set(key, {
			arr[container][key] = {
				type: type,
				msg: msg,
				shown: true
			//});
			};
		}
		//else if (key && arr[container] instanceof Map) {
		else if (key && !(arr[container] instanceof Array)) {
			if (!pendingCollapse) {
				// Increment counts if there is no existing alert with this key
				if (arr[container][key] === undefined) {
					alerts.size[container].total++;
					alerts.size[container][type]++;
				}
				// If the key does exist, but it's getting replaced by an alert
				// of a different type, adjust counts
				else if (arr[container][key].type != type) {
					alerts.size[container][arr[container][key].type]--;
					alerts.size[container][type]++;
				}
				// Otherwise, an existing alert is getting replaced with another
				// alert of the same type, and there is no need to adjust counts
			}

			// If a key for this container was specified at any point during
			// its lifetime, it has been converted to a Map
			//arr[container].set(key, {
			arr[container][key] = {
				type: type,
				msg: msg,
				shown: true
			//});
			};
		}
		else {
			// Increment counts. No key was specified, so this alert cannot be
			// replacing an existing alert.
			if (!pendingCollapse) {
				alerts.size[container].total++;
				alerts.size[container][type]++;
			}

			// If the container is a Map and no key was specified, generate a
			// key based on the current size of the Map.
			//key = arr[container].size;
			key = Object.keys(arr[container]).length;
			//while (arr[container].has(key)) {
			while (arr[container][key] !== undefined) {
				key++;
			}
			//arr[container].set(newKey, {
			arr[container][newKey] = {
				type: type,
				msg: msg,
				shown: true
			//});
			};
			//alerts.size[container] = arr[container].size;
			alerts.size[container] = Object.keys(arr[container]).length;
		}

		// If container is currently collapsed, and collapseOnTimeout is
		// specified on this container, temporarily show this alert in addition
		// to adding it to the collapsed container
		if (!pendingCollapse && alerts.collapseOnTimeout[container] && alerts.collapsed[container]) {
			alerts.add(type, msg, key, container, true);
		}
	};

	// alerts.remove()
	//
	//   Removes an alert.
	//
	// Parameters:
	//   index: a numeric index (if alert.lists[container] is an Array) or a
	//     unique key (if alerts.lists[container] has become an Object).
	//   container (optional): The container from which to remove this alert.
	//   pendingCollapse (optional): Remove message from the pendingCollapse
	//     stack instead of the regular stack
	alerts.remove = function(index, container, pendingCollapse) {
		// Default to global container if none specified
		if (!container) {
			container = "_global";
		}

		// Is this message for the pendingCollapse stack?
		arr = pendingCollapse ? alerts.pendingCollapse : alerts.lists;

		// Bail if container is not defined
		if (arr[container] === undefined) {
			return;
		}

		// Only remove the message if it currently exists
		if (arr[container][index] !== undefined) {
			if (!pendingCollapse) {
				// Decrement counts
				alerts.size[container].total--;
				alerts.size[container][arr[container][index].type]--;
			}

			// Remove alert from view (start animating)
			arr[container][index].shown = false;

			// Delete alert after animation finishes.
			$timeout(function() {
				if (arr[container] instanceof Array) {
					// Remove element from array
					arr[container].splice(index, 1);
				}
				else {
					// Delete object property
					delete arr[container][index];
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
	//   pendingCollapse (optional): Clear messages from the pendingCollapse
	//     stack instead of the regular stack
	alerts.clear = function(container, pendingCollapse) {
		// Default to global container if none specified
		if (!container) {
			container = "_global";
		}

		// Are these messages for the pendingCollapse stack?
		arr = pendingCollapse ? alerts.pendingCollapse : alerts.lists;

		if (arr[container] instanceof Array) {
			// Iterate through array indeces
			arr[container].forEach(function(alert, index) {
				alerts.remove(index, container, pendingCollapse);
			});
		}
		else {
			// Iterate through object properties
			for (var property in arr[container]) {
				alerts.remove(property, container, pendingCollapse);
			}
		}

		if (!pendingCollapse) {
			alerts.size[container] = 0;
		}
	}

	// alerts.collapse()
	//
	//   Collapse an alerts container.
	//
	// Paremter:
	//   container: Name of the container.
	alerts.collapse = function(container) {
		// Default to global container if none specified
		if (!container) {
			container = "_global";
		}

		alerts.collapsed[container] = true;
	}

	// alerts.expand()
	//
	//   Expand an alerts container.
	//
	// Paremter:
	//   container: Name of the container.
	alerts.expand = function(container) {
		// Default to global container if none specified
		if (!container) {
			container = "_global";
		}

		alerts.collapsed[container] = false;
		alerts.clear(container, true);
	}

	return alerts;
}]);

angular.module("LifeStreamAlerts").controller("LifeStreamAlertsController", [ "lsAlerts", "$scope", function(alerts, $scope) {
	var alertsCtrl = this;

	// True if at least one temporary alert associated with a collapseOnTimeout
	// container is showing
	alertsCtrl.pendingCollapseInView = false;

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
			// This is a hack involved in using ngClass to apply a CSS class to
			// an .alerts-container element if at least one temporary alert
			// associated with a collapseOnTimeout container is showing.
			//
			// The hack is necessary because the following CSS selector will not
			// work with ngAnimate:
			//   .some-adjacent-element + .alerts-container.ng-hide-remove
			//
			// The element to which .ng-hide-remove is attached needs to be
			// targettable without any dependency on sibling elements. We use
			// this hack to apply (or unapply) a CSS class to the element that
			// makes it directly targettable.
			alertsCtrl.pendingCollapseInView = (
				alerts.collapseOnTimeout[container] && (
					alerts.pendingCollapse[container].length ||
					Object.keys(alerts.pendingCollapse[container]).length
				)
			) ? true : false;
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
			collapseOnTimeout: "@",
			collapsible: "@",
			container: "@",
			dismissOnTimeout: "@"
		},
		link: function(scope, element, attrs, controller) {
			// Default to global container if none specified
			if (attrs.container === undefined) {
				scope.container="_global";
			}

			// If collapseOnTimeout is set, default this container to collapsed
			// (since new alerts will be temporarily shown anyway)
			if (attrs.collapseOnTimeout) {
				controller.collapsed[scope.container] = true;
			}
			// Otherwise, default container to expanded so the user is able to
			// see alerts as they appear.
			else {
				controller.collapsed[scope.container] = false;
			}

			// Pass value of collapseOnTimeout to the service
			if (Number(attrs.collapseOnTimeout) > 0) {
				controller.collapseOnTimeout[scope.container] = Number(attrs.collapseOnTimeout);
			}

			// If dodge is defined, turn alert bubble translucent when mouse
			// cursor is hovered over it
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
