;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('AdpFieldsService', AdpFieldsService);

  function AdpFieldsService(
    AdpSchemaService,
    CONSTANTS,
    LISTS,
    $http,
    $log,
    IMPERIAL_UNITS
  ) {
    var typeMap = {
      'String': { uiSubtypeType: 'text', directiveType: 'string' },
      'String:Phone': { uiSubtypeType: 'text', directiveType: 'string' },
      'String:Url': { uiSubtypeType: 'text', directiveType: 'string' },
      'String:Email': { uiSubtypeType: 'email', directiveType: 'string' },
      'String:Password': { uiSubtypeType: 'password', directiveType: 'string' },
      'String:Text': { directiveType: 'text' },
      'String[]': { directiveType: 'select-multiple' },
      'Select': { directiveType: 'select' },
      'Date': { directiveType: 'date' },
      'Date:Time': { directiveType: 'date' },
      'Date:DateTime': { directiveType: 'date' },
      'Number': { uiSubtypeType: 'number', directiveType: 'string' },
      'Number:ImperialHeight': { directiveType: 'imperial-units' },
      'Number:ImperialWeightWithOz': { directiveType: 'imperial-units' },
      'Number:ImperialWeight': { directiveType: 'imperial-units' },
      'Search': { directiveType: 'lookup' },
      'Search[]': { directiveType: 'lookup-multiple' },
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
      'FormRender': { directiveType: 'form-render' }
    };

    function getUnits(subtype) {
      var unitsMap = {
        'ImperialHeight': 'HEIGHT',
        'ImperialWeightWithOz': 'WEIGHT_OZ',
        'ImperialWeight': 'WEIGHT',
      };
      var typeName = unitsMap[subtype];

      return IMPERIAL_UNITS[typeName];
    }

    // public
    function getTypeProps(field) {
      var fieldType = AdpSchemaService.getTypeProps(field);

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
      return _.chain(_.clone(fields))
        .map(prepareData)
        .filter(function (field) {
          return !('fields' in field) && _isVisible(field) && field.type !== 'Group';
        })
        .value();
    }

    function _isVisible(field) {
      var isVisible = 'showInForm' in field ? field.showInForm : field.visible;
      if (typeof isVisible === 'boolean') {
        return isVisible;
      } else if (typeof isVisible === 'string') {
        return isVisible === 'true';
      }
      return false;
    }

    function prepareData(field, key) {
      field.keyName = key;
      field.required = !!field.required;
      field.display = true;

      if (field.synthesize) {
        field.visible = false;
      }

      if (field.synthesize && field.formRender) {
        field.visible = true;
      }

      return field;
    }

    function getListOfOptions(list) {
      var resultList = _.isString(list) ? LISTS[list] : list;

      if (_.isArray(resultList)) {
        return _arrayToList(resultList);
      }

      if (_.isObject(resultList)) {
        return _objectToList(resultList);
      }
    }

    function getListOptionsAsync(list) {
      var endpoint = LISTS[list];

      return $http.get(CONSTANTS.apiUrl + endpoint)
        .then(function(result) {
          return _objectToList(result.data.data);
        });
    }

    /**
     * We are following the convention: array index is value, label is array item
     * @param {String[]} list
     * @return {*}
     * @private
     */
    function _arrayToList(list) {
      return _.map(list, function(value, index) {
        return {value: index.toString(), label: value}
      });
    }

    /**
     * We are following the convention: key of object value, label is object value
     * @param {Object} list
     * @return {*}
     * @private
     */
    function _objectToList(list) {
      return _.map(list, function (value, key) {
        return {value: key, label: value}
      });
    }

    function getFormGroupFields(fields) {
      var fields = _.chain(_.clone(fields))
        .map(prepareData)
        .filter(function (field) {
          return !('fields' in field) && _isVisible(field);
        })
        .value();

      var groupsStartIndex = _.findIndex(fields, function (field) {
        return field.type === 'Group';
      });

      var groups = [];
      var groupCnt = -1;

      _.each(fields.splice(groupsStartIndex), function(field) {
        var fieldCopy = _.clone(field);

        if (field.type === 'Group') {
          groupCnt++;
          groups.push(fieldCopy);
          groups[groupCnt].children = [];
          return;
        }

        if (groupCnt > -1) {
          groups[groupCnt].children.push(fieldCopy);
        } else {
          groups.push(fieldCopy);
        }
      });

      return {
        notGrouped: fields.splice(0, groupsStartIndex),
        groups: groups
      };
    }

    return {
      getUnits: getUnits,
      getTypeProps: getTypeProps,
      getFormFields: getFormFields,
      getFormGroupFields: getFormGroupFields,
      getListOfOptions: getListOfOptions,
      getListOptionsAsync: getListOptionsAsync
    };
  }
})();
