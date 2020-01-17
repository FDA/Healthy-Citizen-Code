;(function () {
  'use strict';

  angular
    .module('app.adpTables')
    .filter('adpDataPresenter', adpDataPresenter);

  function adpDataPresenter (
    AdpFilePathService,
    AdpSchemaService,
    AdpFieldsService,
    AdpLookupHelpers,
    DATE_FORMAT,
    TIME_FORMAT,
    DATE_TIME_FORMAT,
    ObjectUtil
  ) {
    // TODO: add formatting function only for lookups
    var typeMap = {
      'String:Password': showPassword,
      'String[]': printStringArray,
      'Number': showNumber,
      'Select': select,
      'SelectMultiple': selectMultiple,
      'Date': date,
      'Date:Time': date,
      'Date:DateTime': date,
      'LookupObjectID': lookupLabel,
      'LookupObjectID[]': lookupMultiple,
      'Boolean': boolean,
      'Location' : showLabel,
      'DynamicList': showLabel,
      'DynamicList[]': showLabel,
      'Number:ImperialHeight': showImperialUnitWithMultipleValue,
      'Number:ImperialWeightWithOz': showImperialUnitWithMultipleValue,
      'Number:ImperialWeight': showImperialUnitWithSingleValue,
      'File': showFileList,
      'Image': showFileList,
      'Audio': showFileList,
      'Video': showFileList,
      'File[]': showFileList,
      'Image[]': showFileList,
      'Audio[]': showFileList,
      'Video[]': showFileList,
      'Mixed': mixed,
      'Object': printObject,
      'Array': printArray,
      'TreeSelector': treeSelector
    };

    // NOTE: value is record object
    return function (rowData, schema, fieldName) {
      var fieldSchema = _.get(schema.fields, fieldName);
      var currentVal = rowData[fieldName];
      var fieldType = AdpSchemaService.getTypeProps(fieldSchema);

      if (!typeMap[fieldType]) {
        return currentVal || '-';
      }

      return typeMap[fieldType](currentVal, fieldSchema, rowData, fieldName);
    };

    function showPassword() {
      return '********';
    }

    function select (value, schema) {
      if (_.isUndefined(value) || _.isNull(value)) {
        return '-';
      }

      var list = schema.list;
      var label = list[value];

      return label || value;
    }

    function selectMultiple(value, schema) {
      if (_.isNil(value) || _.isEmpty(value)) return '-';
      var list = schema.list;
      var values = _.map(value, function (v) {
        return list[v];
      });

      return values.join(', ');
    }

    function date (value, schema) {
      var dateFormats = {
        'Date': DATE_FORMAT,
        'DateTime': DATE_TIME_FORMAT,
        'Time': TIME_FORMAT
      };
      var dateFormat = dateFormats[schema.subtype] || dateFormats['Date'];

      return !!value ? moment(value).format(dateFormat) : '-';
    }

    function lookupLabel(value, fieldSchema, rowData) {
      if (_.isNil(value) || _.isEmpty(value)) {
        return '-';
      } else {
        var params = {
          lookup: value,
          fieldData: value,
          formData: rowData,
          fieldSchema: fieldSchema
        };

        return [
          value.table + ' | ' + AdpLookupHelpers.getLabelRenderer(params),
          '<span class="hidden">' + value._id + '</span>'
        ].join('');
      }
    }

    function lookupMultiple(value, fieldSchema, rowData) {
      if (_.isEmpty(value)) {
        return '-';
      } else {
        return value.map(function (v) {
          var params = {
            lookup: v,
            fieldData: value,
            formData: rowData,
            fieldSchema: fieldSchema
          };

          return [
            v.table + ' | ' + AdpLookupHelpers.getLabelRenderer(params),
            '<span class="hidden">' + value._id + '</span>'
          ].join('');
        }).join('\n');
      }
    }

    function showLabel(value) {
      if (_.isNil(value.label)) {
        return '-';
      }

      return value.label;
    }

    function boolean (value) {
      var boolValue = Boolean(value);
      var iconName = boolValue ? 'check' : 'times';

      return [
        '<i class="fa fa-' + iconName + '"></i>',
        // make searchable
        '<span class="hidden">' + boolValue + '</span>'
      ].join('');
    }

    function showImperialUnitWithMultipleValue(value, schema) {
      var isEmpty = value === 0 || !_.compact(value).length;
      if (isEmpty) {
        return '-';
      }

      var units = AdpFieldsService.getUnits(schema);
      var valueArray = _.isArray(value) ? value : [value];

      var valueWithUnits = _.map(units, function(unit, index) {
        return valueArray[index] + unit.label
      });

      return valueWithUnits.join(' ');
    }

    function showImperialUnitWithSingleValue(value, schema) {
      var isEmpty = _.isNil(value) || (value === 0);

      if (isEmpty) {
        return '-'
      }
      var units = AdpFieldsService.getUnits(schema);
      return value + units[0].label;
    }


    function showFileList(fileList) {
      if (_.isEmpty(fileList)) {
        return '-';
      }

      var interpolationRegex = /\${([^\}]+)}/g;

      var listItemTpl = [
        '<li>',
          '<a class="datatable-thumb-url" href="${downloadUrl}" target="_blank">',
            '<img src=${thumbUrl} class="img-responsive"> ${name}',
          '</a>',
        '</li>',
      ].join('');

      var replaceCb = function(fileItem, _placeholder, placeholderName) {
        var fnName;
        if (placeholderName === 'downloadUrl') {
          return AdpFilePathService.download(fileItem);
        }

        if (placeholderName === 'thumbUrl') {
          fnName = fileItem.cropped ? 'cropped' : 'thumb';
          return AdpFilePathService[fnName](fileItem) + '?v=' + new Date().valueOf();
        }

        return fileItem[placeholderName];
      };

      var fileListTpl = fileList.map(function(fileItem) {
        return listItemTpl.replace(interpolationRegex, replaceCb.bind(this, fileItem));
      }).join('');

      return ['<ul class="datatable-thumb-list">', fileListTpl, '</ul>'].join('');
    }

    function showNumber(value) {
      var number = parseFloat(value);
      return _.isNaN(number) ? '-' : number;
    }

    function mixed(value) {
      if (_.isEmpty(value)) {
        return '-';
      }

      return JSON.stringify(value);
    }

    // create new formatted object
    // any falsy is field excluded, replaced by null or by empty object
    function _formatObject(objectValue, fieldSchema) {
      if (_.isEmpty(objectValue)) {
        return null;
      }
      var newObject = {};

      _.each(objectValue, function (value, name) {
        _formatCb(value, name, fieldSchema, newObject);
      });

      return newObject;
    }

    // create new formatted array
    // any falsy field is excluded, replaced by null or by empty object
    function _formatArray(arrayOfValues, fieldSchema) {
      if (_.isEmpty(arrayOfValues)) {
        return null;
      }

      var newArray = [];

      _.each(arrayOfValues, function (plainObject, index) {
        var arrayItem = {};
        newArray[index] = arrayItem;

        // arrayRow is plain object
        _.each(plainObject, function (value, name) {
          _formatCb(value, name, fieldSchema, arrayItem);
        });
      });

      return newArray;
    }

    function _formatCb(value, name, schema, targetObject) {
      var currentSchema = _.get(schema, 'fields.' + name);
      var fieldType = AdpSchemaService.getTypeProps(currentSchema);

      var isEmpty = _.isUndefined(currentSchema) || name === '_id' ||
        value === '' || _.isUndefined(value) || _.isNull(value) ||
        (_.isArray(value) && value.length === 0) ||
        (_.isPlainObject(value) && _.isEmpty(value));

      if (isEmpty) {
        return;
      }

      if (!typeMap[fieldType]) {
        targetObject[name] = value;
        return;
      }

      if (fieldType === 'Array') {
        targetObject[name] = _formatArray(value, currentSchema);
      } else if (fieldType === 'Object') {
        targetObject[name] = _formatObject(value, currentSchema);
      }else {
        targetObject[name] = typeMap[fieldType](value, currentSchema, targetObject, name);
      }
    }

    function printObject(objectValue, schema) {
      if (_.isNull(objectValue)) {
        return '-';
      }

      var formatted = _formatObject(objectValue, schema);
      var cleaned = ObjectUtil.cleanDeep(formatted);

      return _.isEmpty(cleaned) ? '-' : ObjectUtil.toHTML(cleaned, schema);
    }

    function printArray(arrayOfValues, schema) {
      if (_.isNull(arrayOfValues)) {
        return '-';
      }

      var formatted = _formatArray(arrayOfValues, schema);
      var cleaned = ObjectUtil.cleanDeep(formatted);

      return _.isEmpty(cleaned) ? '-' : ObjectUtil.toHTML(cleaned, schema);
    }

    function printStringArray(strings) {
      if (_.isEmpty(strings)) {
        return '-';
      }
      return strings.join(', ');
    }

    function treeSelector(value) {
      var result = '';

      _.each(value, function (v) {
        if (_.isNil(v)) return;
        result += '<ul class="array-list"><li class="array-item">' + v.label;
      });

      if (result) {
        result += '</li></ul>'.repeat(value.length);
      }

      return result || '-';
    }
  }
})();
