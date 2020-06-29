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
    ImperialUnitSingleFilter,
    ImperialUnitMultipleFilter,
    LookupFilter,
    DecimalFilter,
    CurrencyFilter,
    RelativeDateFilter,
    MongoExpressionFilter,
    DatabaseFieldFilter
  ) {
    var filtersMap = {
      list: ListFilter,
      dynamicList: ListFilter,
      string: StringFilter,
      number: NumberFilter,
      double: NumberFilter,
      decimal128: DecimalFilter,
      date: DateFilter,
      time: DateFilter,
      dateTime: DateFilter,
      boolean: BooleanFilter,
      imperialWeight: ImperialUnitSingleFilter,
      imperialWeightWithOz: ImperialUnitMultipleFilter,
      imperialHeight: ImperialUnitMultipleFilter,
      lookupObjectId: LookupFilter,
      objectId: StringFilter,
      currency: CurrencyFilter,
      relativeDate: RelativeDateFilter,
      mongoExpression: MongoExpressionFilter,
      databaseField: DatabaseFieldFilter,
    };

    function create(options) {
      var filterRenderer = resolveFilterRenderer(options);
      if (!filterRenderer) {
        return;
      }
      return createFilter(filterRenderer, options);
    }

    function formatValue(options) {
      var filterRenderer = resolveFilterRenderer(options);

      if (!filterRenderer) {
        return options.args.data;
      }

      var filterComponent = filterRenderer();

      if (!filterComponent.formatValue) {
        return options.args.data;
      }

      return filterComponent.formatValue(options)
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
      formatValue: formatValue,
    }
  }
})();
