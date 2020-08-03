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
    AdpBrowserService
  ) {
    var typeMap = {
      'String': { directiveType: 'string' },
      'Phone': { directiveType: 'string' },
      'Url': { directiveType: 'string' },
      'Email': { directiveType: 'string' },
      'PasswordAuth': { directiveType: 'string' },
      'Password': { directiveType: 'password' },
      'Text': { directiveType: 'text' },

      Currency: { directiveType: 'currency' },

      'Number': { directiveType: 'number' },
      'Double': { directiveType: 'number' },
      'Int32': { directiveType: 'int-number' },
      'Int64': { directiveType: 'int-number' },
      'Decimal128': { directiveType: 'decimal' },

      'String[]': { directiveType: 'string-array' },
      'Number[]': { directiveType: 'number-array' },
      'Double[]': { directiveType: 'number-array' },
      'Int32[]': { directiveType: 'number-array' },
      'Int64[]': { directiveType: 'number-array' },
      'Decimal128[]': { directiveType: 'decimal-array' },
      'Recaptcha': { directiveType: 'recaptcha' },

      'Boolean': { directiveType: 'boolean' },

      'Date': { directiveType: 'date' },
      'Time': { directiveType: 'date' },
      'DateTime': { directiveType: 'date' },

      'ImperialHeight': { directiveType: 'imperial-units' },
      'ImperialWeightWithOz': { directiveType: 'imperial-units' },
      'ImperialWeight': { directiveType: 'imperial-weight' },

      'LookupObjectID': { directiveType: 'lookup' },
      'LookupObjectID[]': { directiveType: 'lookup' },

      'ObjectID': { directiveType: 'parent-select' },
      'File': { directiveType: 'file' },
      'Image': { directiveType: 'file' },
      'Audio': { directiveType: 'file' },
      'Video': { directiveType: 'file' },
      'File[]': { directiveType: 'file' },
      'Image[]': { directiveType: 'file' },
      'Audio[]': { directiveType: 'file' },
      'Video[]': { directiveType: 'file' },
      'Location': { directiveType: 'location' },

      'List': { directiveType: 'list' },
      'List[]': { directiveType: 'list' },

      'FormRender': { directiveType: 'form-render' },
      'Object': { directiveType: 'object' },
      'Array': { directiveType: 'array' },
      'AssociativeArray': { directiveType: 'array' },
      'Readonly': { directiveType: 'readonly' },
      'TreeSelector': { directiveType: 'tree-selector' },
      'Html': { directiveType: 'html' },
      'Code': { directiveType: 'code' },
      'Grid': { directiveType: 'grid' },
      'Mixed': { directiveType: 'code' },
      'Blank': { directiveType: 'blank' },
    };

    // public
    function getUiProps(field) {
      var fieldType = AdpSchemaService.getFieldType(field);
      var fieldInfo = _.get(field, 'fieldInfo', {});

      // render as Readonly and keep field.type
      if (fieldInfo.read && !fieldInfo.write) {
        return typeMap['Readonly'];
      }

      // render as FormRender and keep field.type
      if ('formRender' in field) {
        return typeMap['FormRender'];
      }

      if (typeMap[fieldType]) {
        return typeMap[fieldType];
      } else {
        $log.debug(
          field.fullName,
          ' field is rendered as default String field. \n',
          field.fullName, ' is not implemented yet. \n',
          'Field model ', field
        );

        return typeMap['String'];
      }
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

      if (field.synthesize) {
        field.showInForm = false;
      }

      if (field.synthesize && field.formRender) {
        field.showInForm = true;
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
      getUiProps: getUiProps,
      getFormFields: getFormFields,
      getFormGroupFields: getFormGroupFields,
      autocompleteValue: autocompleteValue,
      getHeaderRenderer: getHeaderRenderer,
      hasHedearRenderer: hasHedearRenderer,
      configFromParameters: configFromParameters,
    };
  }
})();
