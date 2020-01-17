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
      'String': { uiSubtypeType: 'text', directiveType: 'string' },
      'String:Phone': { uiSubtypeType: 'text', directiveType: 'string' },
      'String:Url': { uiSubtypeType: 'text', directiveType: 'string' },
      'String:Email': { uiSubtypeType: 'email', directiveType: 'string' },
      'String:PasswordAuth': { uiSubtypeType: 'password', directiveType: 'string' },
      'String:Password': { directiveType: 'password' },
      'String:Text': { directiveType: 'text' },
      'String[]': { directiveType: 'string-array' },
      'Select': { directiveType: 'select' },
      'SelectMultiple': { directiveType: 'select-multiple' },
      'Date': { directiveType: 'date' },
      'Date:Time': { directiveType: 'date' },
      'Date:DateTime': { directiveType: 'date' },
      'Number': { uiSubtypeType: 'number', directiveType: 'string' },
      'Number:ImperialHeight': { directiveType: 'imperial-units' },
      'Number:ImperialWeightWithOz': { directiveType: 'imperial-units' },
      'Number:ImperialWeight': { directiveType: 'imperial-weight' },
      'LookupObjectID': { directiveType: 'lookup' },
      'LookupObjectID[]': { directiveType: 'lookup-multiple' },
      'Boolean': { uiType: 'checkbox', directiveType: 'checkbox' },
      'String:Recaptcha': { directiveType: 'recaptcha' },
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
      'DynamicList': { directiveType: 'dynamic-list' },
      'DynamicList[]': { directiveType: 'dynamic-list-multiple' },
      'FormRender': { directiveType: 'form-render' },
      'Object': { directiveType: 'object' },
      'Array': { directiveType: 'array' },
      'Readonly': { directiveType: 'readonly' },
      'TreeSelector': { directiveType: 'tree-selector' },
    };

    // public
    function getTypeProps(field) {
      var fieldType = AdpSchemaService.getTypeProps(field);
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
      var form = {notGrouped: []};

      form.notGrouped = _.chain(_.clone(fields))
        .map(prepareData)
        .filter(function (field) {
          // field with type Mixed is only for backend usage
          if (field.type === 'Mixed') {
            return false;
          }

          return AdpSchemaService.isField(field) &&
            !AdpSchemaService.isGroup(field) &&
            _isVisible(field);
        })
        .filter(_applyPermissions)
        .value();

      return form;
    }

    function _isVisible(field) {
      return field.showInForm;
    }

    // !!! mutation
    function _applyPermissions(field) {
      var fieldInfo = _.get(field, 'fieldInfo', {});

      if (!fieldInfo.read) {
        return false;
      }

      return true;
    }

    function prepareData(field, key) {
      field.keyName = key;

      if (!_.isString(field.required)) {
        field.required = !!field.required;
      }

      if (field.synthesize) {
        field.visible = false;
      }

      if (field.synthesize && field.formRender) {
        field.visible = true;
      }

      return field;
    }

    function getListOfOptions(list) {
      return _objectToList(list);
    }

    function getListOptionsAsync(list) {
      var endpoint = list;

      return $http.get(APP_CONFIG.apiUrl + endpoint)
        .then(function(result) {
          return _objectToList(result.data.data);
        });
    }

    /**
     * List is object of shape {key, value}
     * @param {Object} list
     * @return {*}
     * @private
     */
    function _objectToList(list) {
      return _.map(list, function (value, key) {
        return {value: key, label: value}
      });
    }

    function getValidListValues(values, field) {
      var listOfValues = _.map(field.list, function (_v, key) {
        return key;
      });
      var filtered = _.intersection(values, listOfValues);

      if (_.isEmpty(filtered)) {
        return null;
      } else {

        var isArrayType = field.type.includes('[]');
        return isArrayType ? filtered : filtered[0];
      }
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
      var grouped =_.groupBy(fields, function (field) {
        if (field.type === 'Group') {
          lastGroup = field.keyName;
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

      return groupedFields;
    }

    function getUnits(field) {
      var subtype = field.subtype;
      var params = field.params;
      var units = _.cloneDeep(IMPERIAL_UNITS_DEFAULTS[subtype]);

      var isWeightField = subtype.includes('Weight');

      if (params && isWeightField) {
        setRangesFromParams(units, params);
      }

      return units;
    }

    function setRangesFromParams(units, params) {
      var imperialWeightUnit = _.find(units, function(unit) {
        return unit.label === 'lb';
      });

      imperialWeightUnit.range[0] = params.minLb;
      imperialWeightUnit.range[1] = params.maxLb  + 1;
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

    function getHeaderRenderer(params) {
      var renderName = params.fieldSchema.headerRender;
      var renderFn = appModelHelpers.HeaderRenderers[renderName];

      if (renderFn) {
        return renderFn(params);
      } else {
        return params.fieldSchema.fullName;
      }
    }

    function hasHedearRenderer(fieldSchema) {
      var renderName = fieldSchema.headerRender;
      return !!appModelHelpers.HeaderRenderers[renderName];
    }

    return {
      getUnits: getUnits,
      getTypeProps: getTypeProps,
      getFormFields: getFormFields,
      getFormGroupFields: getFormGroupFields,
      getListOfOptions: getListOfOptions,
      getListOptionsAsync: getListOptionsAsync,
      getValidListValues: getValidListValues,
      autocompleteValue: autocompleteValue,
      getHeaderRenderer: getHeaderRenderer,
      hasHedearRenderer: hasHedearRenderer,
    };
  }
})();
