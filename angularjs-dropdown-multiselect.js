/** DOCUMENTATION
 * 
 * Dynamically loading list of options - https://github.com/kamilkp/angular-vs-repeat
 * 
 * Implementation steps:
 * 1) Add dependency "dropdown"
 * 2) View - use it as Element "dropdown-multiselect" or as Attribute (dropdown-multiselect="") 
 * 3) Controller - create model and map it to selectedModel, same is with extraSettings
 * 4) Enjoy)
 * 
 * Directive's inner scope: 
 * @param {Array | Object} selectedModel - Selected items will be placed here									
 * @param {Array | Object} options - Options for the dropdown
 * @param {Object} extraSettings - Settings for the directive
 * @param {Object} events - Map of functions, that are fired on events
 * @param {Object} translationTexts - Give an ability to modify texts in the directive
 * 
 * Translation texts params:
 * @property {String} checkAll - Check all button text
 * @property {String} uncheckAll - Uncheck all button text
 * @property {String} dynamicButtonTextSuffix - Text after number of selected items (when selection count is over 1 item)
 * @property {String} searchPlaceholder - Text to represent in search input
 * @property {String} buttonDefaultText - Default text to represent in select input, when nothing is selected yet
 * 			
 * Events:
 * @function onItemSelect(item) - fired when selecting an item
 * @function onItemDeselect(item) - fired when unselecting an item
 * @function onSelectAll - fired when clicking select all
 * @function onDeselectAll - fired when clicking deselect all
 * @function onInitDone - fired when the directive done with the link phase
 * @function onMaxSelectionReached - fired when user reaches the max allowed selected items
 * @function onSelectionChanged - fired when the selection changes
 * 
 * Settings properties: (related to extraSettings )
 * @property {String} displayProp - The name of the property, which contains text to display in select
 * @property {Boolean} enableSearch - Indicates if to show the search input or not
 * @property {String} searchField - Indicates on which field the search should be done
 * @property {String} idProperty - Property we want to add in our model on item select (if you do not specify it, model will be updated with object, that contains that property)
 * @property {Boolean} showCheckAll - Indicates if to show Check all control
 * @property {Boolean} showUncheckAll - Indicates if to show Uncheck all item
 * @property {Number} selectionLimit - The max allowed items to select. (1 - single select) or (do not specify - multiple select)
 * @property {String} searchField - Indicates on which field search should be done
 * @property {Boolean} closeOnSelect - Indicated if to close the dropdown after checking an item in the list
 * @property {String} template - Can be used to modify the appearance of an option in the list. Use it if you have a list of simple types.
 * @property {Number} smartButtonMaxItems - Manages the maximum of selected items to show on the select input
 * @property {Boolean} checkBoxes - Indicates if to show checkbox near option in the list
 * @property {String} selectPlaceholderAddon - Additional custom String to specify what is in the list. Select default text = buttonDefaultText + selectPlaceholderAddon
 * @property {Boolean} selectedToTop - When true will put the selected options at the top of the list
 * 
 */


angular.module('dropdown', [])
.directive('dmDropdownStaticInclude', ["$compile", function ($compile) {
    'ngInject';

    return function directive(scope, element, attrs) {
        var template = attrs.dmDropdownStaticInclude;
        var contents = element.html(template).contents();
        $compile(contents)(scope);
    };
}])
.directive('dropdownMultiselect', [function() {
    return {
        restrict: 'AE',
			scope: {
				selectedModel: '=',
				options: '=',
				extraSettings: '=',
				events: '=',
				searchFilter: '=?',
				translationTexts: '=',
				disabled: '=',
			},
			transclude: {
				toggleDropdown: '?toggleDropdown'
			},
			controller: 'dropdownMultiselectController',
			templateUrl: 'assets/vender/dropdown-multiselect/angularjs-dropdown-multiselect.html'
    }
}])
.controller('dropdownMultiselectController', ["$scope", "$window", "$element", "$filter", "$document", 'orderByFilter', function($scope, $window, $element, $filter, $document, orderBy) {
    function contains(collection, target) {
		var containsTarget = false;
		collection.some(function (object) {
			if (object === target) {
				containsTarget = true;
				return true;
			}
			return false;
		});
		return containsTarget;
	}

	function getIndexByProperty(collection, objectToFind, property) {
		return collection.indexOf(objectToFind[property]);
	}
    
    var $dropdownTrigger = $element.children()[0];
		var externalEvents = {
			onItemSelect: angular.noop,
			onItemDeselect: angular.noop,
			onSelectAll: angular.noop,
			onDeselectAll: angular.noop,
			onInitDone: angular.noop,
			onMaxSelectionReached: angular.noop,
			onSelectionChanged: angular.noop,
			onClose: angular.noop
		};

		var settings = {
			selectionToTop: true,
			selectPlaceholderAddon: 'Fields',
			dynamicTitle: true,
			scrollable: false,
			scrollableHeight: 'auto',
			closeOnBlur: true,
			displayProp: '',
			enableSearch: false,
			clearSearchOnClose: false,
			selectionLimit: 0,
			showCheckAll: false,
			showUncheckAll: false,
			showEnableSearchButton: false,
			closeOnSelect: false,
			buttonClasses: 'btn btn-default',
			closeOnDeselect: false,
			groupBy: undefined,
			checkBoxes: true,
			groupByTextProvider: null,
			smartButtonMaxItems: 0,
			smartButtonTextConverter: angular.noop,
			styleActive: false,
			selectedToTop: false,
			keyboardControls: false,
			template: '{{getPropertyForObject(option, settings.displayProp)}}',
			searchField: '$',
			showAllSelectedText: false
		};

		var texts = {
			checkAll: 'Check All',
			uncheckAll: 'Uncheck All',
			selectionCount: 'items selected',
			selectionOf: '/',
			searchPlaceholder: 'Search...',
			buttonDefaultText: 'Please select ',
			dynamicButtonTextSuffix: 'items selected',
			disableSearch: 'Disable search',
			enableSearch: 'Enable search',
			selectGroup: 'Select all:',
			allSelectedText: 'All'
		};

		var input = {
			searchFilter: $scope.searchFilter || ''
		};

		angular.extend(settings, $scope.extraSettings || []);
		angular.extend(externalEvents, $scope.events || []);
		angular.extend(texts, $scope.translationTexts);

		if (settings.closeOnBlur) {
			$document.on('click', function (e) {
				if ($scope.open) {
					var target = e.target.parentElement;
					var parentFound = false;

					while (angular.isDefined(target) && target !== null && !parentFound) {
						if (!!target.className.split && contains(target.className.split(' '), 'multiselect-parent') && !parentFound) {
							if (target === $dropdownTrigger) {
								parentFound = true;
							}
						}
						target = target.parentElement;
					}

					if (!parentFound) {
						$scope.$apply(function () {
							$scope.close();
						});
					}
				}
			});
		}

		angular.extend($scope, {
			toggleDropdown: toggleDropdown,
			checkboxClick: checkboxClick,
			externalEvents: externalEvents,
			settings: settings,
			texts: texts,
			input: input,
			close: close,
			selectCurrentGroup: selectCurrentGroup,
			getGroupLabel: getGroupLabel,
			getButtonText: getButtonText,
			getPropertyForObject: getPropertyForObject,
			selectAll: selectAll,
			deselectAll: deselectAll,
			setSelectedItem: setSelectedItem,
			isChecked: isChecked,
			keyDownLink: keyDownLink,
			keyDownSearchDefault: keyDownSearchDefault,
			keyDownSearch: keyDownSearch,
			getFilter: getFilter,
			toggleSearch: toggleSearch,
			keyDownToggleSearch: keyDownToggleSearch,
			orderFunction: orderFunction
		});

		$scope.externalEvents.onInitDone();

		function focusFirstOption() {
			setTimeout(function () {
				var elementToFocus = angular.element($element)[0].querySelector('.option');
				if (angular.isDefined(elementToFocus) && elementToFocus != null) {
					elementToFocus.focus();
				}
			}, 0);
		}

		function toggleDropdown() {
			if ($scope.open) {
				initialization();
				$scope.close();
			} else {
				$scope.open = true;
				$scope.settings.selectedToTop = false;
			}
			if ($scope.settings.keyboardControls) {
				if ($scope.open) {
					if ($scope.settings.selectionLimit === 1 && $scope.settings.enableSearch) {
						setTimeout(function () {
							angular.element($element)[0].querySelector('.searchField').focus();
						}, 0);
					} else {
						focusFirstOption();
					}
				}
			}
			if ($scope.settings.enableSearch) {
				if ($scope.open) {
					setTimeout(function () {
						angular.element($element)[0].querySelector('.searchField').focus();
					}, 0);
				}
			}
		}

		function initialization() {
			$scope.settings.selectedToTop = true;
			$scope.options = $filter('orderBy')($scope.options, $scope.settings.displayProp);
			if ($scope.settings.selectionToTop && $scope.selectedModel.length !== 0) {
				$scope.options = orderBy($scope.options, '', false, orderFunction);
			}
		}

		function checkboxClick($event, option) {
			$scope.setSelectedItem(option, false, true);
			$event.stopImmediatePropagation();
		}

		function close() {
			$scope.open = false;
			$scope.input.searchFilter = $scope.settings.clearSearchOnClose ? '' : $scope.input.searchFilter;
			$scope.externalEvents.onClose();
		}

		function selectCurrentGroup(currentGroup) {
			$scope.selectedModel.splice(0, $scope.selectedModel.length);
			$scope.options.forEach(function (item) {
				if (item[$scope.settings.groupBy] === currentGroup) {
					$scope.setSelectedItem(item, false, false);
				}
			});
			$scope.externalEvents.onSelectionChanged();
		}

		function getGroupLabel(groupValue) {
			if ($scope.settings.groupByTextProvider !== null) {
				return $scope.settings.groupByTextProvider(groupValue);
			}

			return groupValue;
		}

		function textWidth(text) {
			var $btn = $element.find('button');
			var canvas = document.createElement('canvas');
			var ctx = canvas.getContext('2d');
			ctx.font = $btn.css('font-size') + $btn.css('font-family');
			ctx.originalFont = $btn.css('font-size') + $btn.css('font-family');
			ctx.fillStyle = '#000000';
			return ctx.measureText(text).width;
		}

		function getButtonText() {
			if ($scope.settings.dynamicTitle && $scope.selectedModel && $scope.selectedModel.length > 0) {
				if (angular.isFunction($scope.settings.smartButtonTextProvider)) {
					return $scope.settings.smartButtonTextProvider($scope.selectedModel);
				}

				if ($scope.settings.smartButtonMaxItems > 0) {
					var paddingWidth = 12 * 2;
					var borderWidth = 1 * 2;
					var dropdownIconWidth = 8;
					var widthLimit = $element[0].offsetWidth - paddingWidth - borderWidth - dropdownIconWidth;

					var itemsText = [];

					angular.forEach($scope.options, function (optionItem) {
						if ($scope.isChecked(optionItem)) {
							var displayText = $scope.getPropertyForObject(optionItem, $scope.settings.displayProp);
							var converterResponse = $scope.settings.smartButtonTextConverter(displayText, optionItem);

							itemsText.push(converterResponse || displayText);
						}
					});

					if ($scope.selectedModel.length > 1 && $scope.settings.smartButtonMaxItems === 1) {
						var totalSelected = angular.isDefined($scope.selectedModel) ? $scope.selectedModel.length : 0;
						return totalSelected + ' ' + $scope.texts.dynamicButtonTextSuffix;
					}

					if ($scope.selectedModel.length > $scope.settings.smartButtonMaxItems) {
						itemsText = itemsText.slice(0, $scope.settings.smartButtonMaxItems);
						itemsText.push('...');
					}

					var result = itemsText.join(', ');
					var index = result.length - 4;
					if ($element[0].offsetWidth === 0) {
						return result;
					}
					if (widthLimit <= textWidth('...')) {
						return '...';
					}
					while (textWidth(result) > widthLimit) {
						if (itemsText[itemsText.length - 1] !== '...') {
							itemsText.push('...');
							result = result + '...';
							index = result.length - 4;
						}
						result = result.slice(0, index) + result.slice(index + 1);
						index -= 1;
					}

					return result;
				}

				var totalSelected = angular.isDefined($scope.selectedModel) ? $scope.selectedModel.length : 0;

				if (totalSelected === 0) {
					return ($scope.texts.buttonDefaultText + ' ' + $scope.settings.selectPlaceholderAddon);
				}

				if ($scope.settings.showAllSelectedText && totalSelected === $scope.options.length) {
					return $scope.texts.allSelectedText;
				}
				
				return totalSelected + ' ' + $scope.texts.dynamicButtonTextSuffix;
			}
			return ($scope.texts.buttonDefaultText + $scope.settings.selectPlaceholderAddon);
		}

		function getPropertyForObject(object, property) {
			if (angular.isDefined(object) && Object.prototype.hasOwnProperty.call(object, property)) {
				return object[property];
            } else if (typeof object === 'string' || typeof object === 'number') {
				return object;
			}
            
			return undefined;
		}

		function selectAll() {
			$scope.deselectAll(true);
			$scope.externalEvents.onSelectAll();

			var searchResult = $filter('filter')($scope.options, $scope.getFilter($scope.input.searchFilter));
			angular.forEach(searchResult, function (value) {
				// if(value.disabled !== true) {
					$scope.setSelectedItem(value, true, false);
				// }
			});
			$scope.externalEvents.onSelectionChanged();
			$scope.selectedGroup = null;
			$scope.selectedAllClicked = true;
		}

		function deselectAll() {
			var dontSendEvent = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

			if (!dontSendEvent) {
				$scope.externalEvents.onDeselectAll();
			}

			if ($scope.settings.enableSearch) {
				searchResult = $filter('filter')($scope.options, $scope.getFilter($scope.input.searchFilter));
				angular.forEach(searchResult, function(value) {
					if ($scope.isChecked(value)) {
						$scope.setSelectedItem(value, false);
					}
				});
			} else {
				$scope.selectedModel.splice(0, $scope.selectedModel.length);
			}

			if (!dontSendEvent) {
				$scope.externalEvents.onSelectionChanged();
			}
			$scope.selectedGroup = null;
		}

		function setSelectedItem(option) {
			var dontRemove = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
			var fireSelectionChange = arguments[2];

			var exists = void 0;
			var indexOfOption = void 0;
			if (angular.isDefined(settings.idProperty)) {
				exists = getIndexByProperty($scope.selectedModel, option, settings.idProperty) !== -1;
				indexOfOption = getIndexByProperty($scope.selectedModel, option, settings.idProperty);
			} else {
				exists = $scope.selectedModel.indexOf(option) !== -1;
				indexOfOption = $scope.selectedModel.indexOf(option);
			}

			if (!dontRemove && exists) {
				$scope.selectedModel.splice(indexOfOption, 1);
				$scope.externalEvents.onItemDeselect(option);
				if ($scope.settings.closeOnDeselect) {
					$scope.close();
				}
			} else if (!exists && ($scope.settings.selectionLimit === 0 || $scope.selectedModel.length < $scope.settings.selectionLimit)) {
				if (!!settings.idProperty) {
					$scope.selectedModel.push(option[settings.idProperty]);
				}
				if (!settings.idProperty) {
					$scope.selectedModel.push(option);
				}
				if (fireSelectionChange) {
					$scope.externalEvents.onItemSelect(option);
				}
				if ($scope.settings.closeOnSelect) {
					$scope.close();
				}
				if ($scope.settings.selectionLimit > 0 && $scope.selectedModel.length === $scope.settings.selectionLimit) {
					$scope.externalEvents.onMaxSelectionReached();
				}
			} else if ($scope.settings.selectionLimit === 1 && !exists && $scope.selectedModel.length === $scope.settings.selectionLimit) {
				$scope.selectedModel.splice(0, 1);
				if (!!settings.idProperty) {
					$scope.selectedModel.push(option[settings.idProperty]);
				}
				if (!settings.idProperty) {
					$scope.selectedModel.push(option);
				}
				if (fireSelectionChange) {
					$scope.externalEvents.onItemSelect(option);
				}
				if ($scope.settings.closeOnSelect) {
					$scope.close();
				}
			}
			if (fireSelectionChange) {
				$scope.externalEvents.onSelectionChanged();
			}
			$scope.selectedGroup = null;
		}

		function isChecked(option) {
			if (angular.isDefined(settings.idProperty)) {
				return getIndexByProperty($scope.selectedModel, option, settings.idProperty) !== -1;
			}
			return $scope.selectedModel.indexOf(option) !== -1;
		}

		function keyDownLink(event) {
			var sourceScope = angular.element(event.target).scope();
			var nextOption = void 0;
			var parent = event.target.parentNode;
			if (!$scope.settings.keyboardControls) {
				return;
			}
			if (event.keyCode === 13 || event.keyCode === 32) {
				// enter
				event.preventDefault();
				if (sourceScope.option) {
					$scope.setSelectedItem(sourceScope.option, false, true);
				} else if (event.target.id === 'deselectAll') {
					$scope.deselectAll();
				} else if (event.target.id === 'selectAll') {
					$scope.selectAll();
				}
			} else if (event.keyCode === 38) {
				// up arrow
				event.preventDefault();
				if (parent.previousElementSibling) {
					nextOption = parent.previousElementSibling.querySelector('a') || parent.previousElementSibling.querySelector('input');
				}
				while (!nextOption && !!parent) {
					parent = parent.previousElementSibling;
					if (parent) {
						nextOption = parent.querySelector('a') || parent.querySelector('input');
					}
				}
				if (nextOption) {
					nextOption.focus();
				}
			} else if (event.keyCode === 40) {
				// down arrow
				event.preventDefault();
				if (parent.nextElementSibling) {
					nextOption = parent.nextElementSibling.querySelector('a') || parent.nextElementSibling.querySelector('input');
				}
				while (!nextOption && !!parent) {
					parent = parent.nextElementSibling;
					if (parent) {
						nextOption = parent.querySelector('a') || parent.querySelector('input');
					}
				}
				if (nextOption) {
					nextOption.focus();
				}
			} else if (event.keyCode === 27) {
				event.preventDefault();

				$scope.toggleDropdown();
			}
		}

		function keyDownSearchDefault(event) {
			var parent = event.target.parentNode.parentNode;
			var nextOption = void 0;
			if (!$scope.settings.keyboardControls) {
				return;
			}
			if (event.keyCode === 9 || event.keyCode === 40) {
				// tab
				event.preventDefault();
				focusFirstOption();
			} else if (event.keyCode === 38) {
				event.preventDefault();
				if (parent.previousElementSibling) {
					nextOption = parent.previousElementSibling.querySelector('a') || parent.previousElementSibling.querySelector('input');
				}
				while (!nextOption && !!parent) {
					parent = parent.previousElementSibling;
					if (parent) {
						nextOption = parent.querySelector('a') || parent.querySelector('input');
					}
				}
				if (nextOption) {
					nextOption.focus();
				}
			} else if (event.keyCode === 27) {
				event.preventDefault();

				$scope.toggleDropdown();
			}
		}

		function keyDownSearch(event, searchFilter) {
			var searchResult = void 0;
			if (!$scope.settings.keyboardControls) {
				return;
			}
			if (event.keyCode === 13) {
				if ($scope.settings.selectionLimit === 1 && $scope.settings.enableSearch) {
					searchResult = $filter('filter')($scope.options, $scope.getFilter(searchFilter));
					if (searchResult.length === 1) {
						$scope.setSelectedItem(searchResult[0], false, true);
					}
				} else if ($scope.settings.enableSearch) {
					$scope.selectAll();
				}
			}
		}

		function getFilter(searchFilter) {
			var filter = {};
			filter[$scope.settings.searchField] = searchFilter;
			return filter;
		}

		function toggleSearch($event) {
			if ($event) {
				$event.stopPropagation();
			}
			$scope.settings.enableSearch = !$scope.settings.enableSearch;
			if (!$scope.settings.enableSearch) {
				$scope.input.searchFilter = '';
			}
		}

		function keyDownToggleSearch() {
			if (!$scope.settings.keyboardControls) {
				return;
			}
			if (event.keyCode === 13) {
				$scope.toggleSearch();
				if ($scope.settings.enableSearch) {
					setTimeout(function () {
						angular.element($element)[0].querySelector('.searchField').focus();
					}, 0);
				} else {
					focusFirstOption();
				}
			}
		}

		function orderFunction(object1, object2) {
			if (angular.isUndefined(object2)) {
				return -1;
			}
			if (angular.isUndefined(object1)) {
				return 1;
			}
			// if (object1.type !== 'object' || object2.type !== 'object') {
			// 	return object1.index < object2.index ? -1 : 1;
			// }
			var v1 = object1.value;
			var v2 = object2.value;
			// first order by group
			if ($scope.settings.groupBy) {
				if (v1[$scope.settings.groupBy] !== v2[$scope.settings.groupBy]) {
					if (v1[$scope.settings.groupBy] < v2[$scope.settings.groupBy]) {
						return 1;
					}
					return -1;
				}
			}
			if (!$scope.settings.selectedToTop) {
				return $scope.options.indexOf(v1) < $scope.options.indexOf(v2) ? -1 : 1;
			}
			// then order selected to top
			if (!$scope.isChecked(v1) && !$scope.isChecked(v2) || $scope.isChecked(v1) && $scope.isChecked(v2)) {
				return $scope.options.indexOf(v1) < $scope.options.indexOf(v2) ? -1 : 1;
			}
			if ($scope.isChecked(v1)) {
				return -1;
			}
			return 1;
		}
}])
