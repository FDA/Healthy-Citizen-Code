;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('GridFiltersFactory', GridFiltersFactory);

  /** @ngInject */
  function GridFiltersFactory(
    GridFilterHelpers,
    AdpSchemaService,
    NumberFilter,
    DateFilter,
    ListFilter,
    StringFilter,
    BooleanFilter,
    imperialUnitSingleFilter,
    imperialUnitMultipleFilter,
    LookupFilter
  ) {
    var filtersMap = {
      list: ListFilter,
      dynamicList: ListFilter,
      string: StringFilter,
      number: NumberFilter,
      date: DateFilter,
      time: DateFilter,
      dateTime: DateFilter,
      boolean: BooleanFilter,
      imperialWeight: imperialUnitSingleFilter,
      imperialWeightWithOz: imperialUnitMultipleFilter,
      imperialHeight: imperialUnitMultipleFilter,
      lookupObjectId: LookupFilter,
    };

    function create(options) {
      var filterRenderer = resolveFilterRenderer(options);
      if (!filterRenderer) {
        return;
      }
      return createFilter(filterRenderer, options);
    }

    function createFilter(filterByType, options) {
      var newFilterComponent = filterByType();
      assertFilterHasRequiredFields(newFilterComponent, options);
      newFilterComponent.create(options);

      postCreateActions(newFilterComponent);

      return newFilterComponent;
    }

    var shouldImplement = ['create', 'getElement', 'reset'];
    function assertFilterHasRequiredFields(filterComponent) {
      if (hasNotImplementedMethods(filterComponent)) {
        throw new Error(assertionMessage(options.args.modelSchema.fieldName));
      }
    }

    function assertionMessage(fieldName) {
      return [
        'Filter component must implement required methods: "',
        shouldImplement.join(', '),
        '" for field',
        fieldName
      ].join(' ');
    }

    function hasNotImplementedMethods(filterComponent) {
      var filterCondition = function (methodName) {
        return !_.isFunction(filterComponent[methodName]);
      };

      var notImplemented = shouldImplement.filter(filterCondition);

      return notImplemented.length > 0;
    }

    function postCreateActions(filterComponent) {
      GridFilterHelpers.saveFilterInstanceToDom(filterComponent);
      addUniqueClassToFilter(filterComponent);
    }

    function addUniqueClassToFilter(component) {
      var element = component.getElement();
      var classToAdd = GridFilterHelpers.filterClass();
      $(element).addClass(classToAdd);
    }

    function resolveFilterRenderer(options) {
      var field = options.args.modelSchema;
      var filterRenderer = GridFilterHelpers.getFilterRenderer(field);

      if (!filterRenderer) {
        return;
      }

      return filtersMap[filterRenderer.value];
    }

    return {
      create: create,
    }
  }
})();
