;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('AdpFieldsService', AdpFieldsService);

  function AdpFieldsService(
    AdpSchemaService,
    APP_CONFIG,
    $http,
    $log,
    IMPERIAL_UNITS_DEFAULTS,
    AdpBrowserService,
    DX_CONTROLS,
    FIELDS_WITH_UNIQUE_WRAPPER
  ) {
    function getDirectiveType(field) {
      var fieldInfo = _.get(field, 'fieldInfo', {});
      var isReadonly = fieldInfo.read && !fieldInfo.write;
      if (isReadonly) {
        return 'readonly';
      }

      if (field.formRender) {
        return 'default';
      }

      var isComplex = FIELDS_WITH_UNIQUE_WRAPPER.includes(field.type);
      if (isComplex) {
        return field.type === 'AssociativeArray' ? 'array' : _.kebabCase(field.type);
      }

      return 'default';
    }

    // public
    function getFormFields(fields) {
      var form = { notGrouped: [] };

      form.notGrouped = _.chain(_.clone(fields))
        .map(prepareData)
        .filter(function (field) {
          return AdpSchemaService.isField(field) &&
            !AdpSchemaService.isGroup(field) &&
            _isVisible(field);
        })
        .filter(_applyPermissions)
        .sortBy(getOrder)
        .value();

      return form;
    }

    function _isVisible(field) {
      return field.showInForm;
    }

    function _applyPermissions(field) {
      var fieldInfo = _.get(field, 'fieldInfo', {});

      if (!fieldInfo.read) {
        return false;
      }

      return true;
    }

    function prepareData(field) {
      if (!_.isString(field.required)) {
        field.required = !!field.required;
      }

      return field;
    }

    function getFormGroupFields(fields) {
      // filtration
      var fields = _.chain(_.clone(fields))
        .map(prepareData)
        .filter(function (field) {
          if (field.type === 'Mixed') {
            return false;
          }

          return (AdpSchemaService.isField(field) || AdpSchemaService.isGroup(field)) &&
            _isVisible(field);
        })
        .filter(function (field) {
          if (AdpSchemaService.isGroup(field)) {
            return true;
          }

          return _applyPermissions(field);
        })
        .value();

      var lastGroup = 'notGrouped';
      var groups = {};
      // groups: {
      //  notGrouped[field],
      //  groups: {
      //    groupName: {
      //      type: 'Group',
      //      fields[field]
      //    },
      //    ...
      //  }
      // }
      var grouped = _.groupBy(fields, function (field) {
        if (field.type === 'Group') {
          lastGroup = field.fieldName;
        }

        return lastGroup;
      });

      var groupedFields = {
        notGrouped: grouped.notGrouped,
        groups: {}
      };

      _.each(grouped, function (group, groupName) {
        if (groupName === 'notGrouped') {
          return;
        }

        // FIXME: filtration
        groupedFields.groups[groupName] = group[0];
        groupedFields.groups[groupName].fields = group.slice(1);
      });

      groupedFields.groups = _.omitBy(groupedFields.groups, function (group, key) {
        if (!group.fieldInfo.read) {
          return true;
        }
      });

      _.each(groupedFields.groups, function (group) {
        var fieldInfo = _.get(group, 'fieldInfo', {});

        if (fieldInfo.read && !fieldInfo.write) {
          _.each(group.fields, function (f) {
            f.fieldInfo = _.clone(fieldInfo);
          });
        }
      });

      return sortGroups(groupedFields);
    }

    function sortGroups(groupedFields) {
      var getSortedFields = function (fields) {
        return _.sortBy(fields, function (f) {
          return f.formOrder;
        });
      };

      groupedFields.notGrouped = getSortedFields(groupedFields.notGrouped);
      groupedFields.groups = getSortedFields(groupedFields.groups);

      var newGroups = {};
      _.each(groupedFields.groups, function (group) {
        if (group.type === 'Group') {
          group.fields = getSortedFields(group.fields);
          newGroups[group.fieldName] = group;
        }
      });
      groupedFields.groups = newGroups;

      return groupedFields;
    }

    function getUnitsList(field) {
      var units = getUnits(field);

      return units.map(function (unit) {
        var begin = unit.range[0]
        var end = unit.range[1]
        var unitRange = _.range(begin, end);

        return {
          list: _.map(unitRange, function (i) {
            return { value: i, label: i + unit.label }
          }),
          shortName: unit.shortName,
        }
      });
    }

    function getUnits(field) {
      var type = field.type;
      var units = _.cloneDeep(IMPERIAL_UNITS_DEFAULTS[type]);

      var isWeightField = type.includes('Weight');
      if (isWeightField) {
        setRangesFromParams(units, field);
      }

      return units;
    }

    function setRangesFromParams(units, field) {
      var imperialWeightUnit = _.find(units, function(unit) {
        return unit.label === 'lb';
      });

      imperialWeightUnit.range[0] = _.get(field, 'parameters.minLb',  imperialWeightUnit.range[0]);
      imperialWeightUnit.range[1] = _.get(field, 'parameters.maxLb',  imperialWeightUnit.range[1] + 1);
    }

    function autocompleteValue(field) {
      var fieldAutocomplete = field.autocomplete;

      if (fieldAutocomplete === 'disableMobile') {
        fieldAutocomplete = AdpBrowserService.isMobile() ? 'disable' : 'enable';
      }

      var autocompleteStd = {
        'enable': 'on',
        'disable': AdpBrowserService.isChrome() ? 'nope' : 'off',
      };

      if (_.isUndefined(autocompleteStd[fieldAutocomplete])) {
        return fieldAutocomplete;
      } else {
        return autocompleteStd[fieldAutocomplete];
      }
    }

    function getHeaderRenderer(args) {
      var renderName = args.fieldSchema.headerRender;
      var renderFn = appModelHelpers.HeaderRenderers[renderName];

      var oldParamsForCompatibility = {
        fieldData: args.data,
        formData: args.row,
        fieldSchema: args.fieldSchema,
        index: args.index,
      };

      if (renderFn) {
        return renderFn.call(args, oldParamsForCompatibility);
      } else {
        return args.fieldSchema.fullName;
      }
    }

    function hasHedearRenderer(fieldSchema) {
      var renderName = fieldSchema.headerRender;
      return !!appModelHelpers.HeaderRenderers[renderName];
    }

    function getOrder(field) {
      var val = Number(field.formOrder);

      return _.isNaN(val) ? undefined : val;
    }

    function configFromParameters(field, defaults) {
      var parameters = _.get(field, 'parameters', {});
      _.unset(parameters, 'visible');
      return _.merge({}, defaults, parameters);
    }

    return {
      getUnits: getUnits,
      getUnitsList: getUnitsList,
      getDirectiveType: getDirectiveType,
      getFormFields: getFormFields,
      getFormGroupFields: getFormGroupFields,
      autocompleteValue: autocompleteValue,
      getHeaderRenderer: getHeaderRenderer,
      hasHedearRenderer: hasHedearRenderer,
      configFromParameters: configFromParameters,
    };
  }
})();
