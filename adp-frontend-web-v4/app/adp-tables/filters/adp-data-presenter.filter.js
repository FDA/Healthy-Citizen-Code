;(function () {
  'use strict';

  angular
    .module('app.adpTables')
    .filter('adpDataPresenter', adpDataPresenter);

  function adpDataPresenter (
    AdpFilePathService,
    AdpSchemaService,
    AdpFieldsService,
    DATE_FORMAT,
    TIME_FORMAT,
    DATE_TIME_FORMAT,
    ObjectUtil
  ) {
    // TODO: add formatting function only for lookups
    var typeMap = {
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
      'Number:ImperialHeight': showImperialUnit,
      'Number:ImperialWeightWithOz': showImperialUnit,
      'Number:ImperialWeight': showImperialUnit,
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
      'Array': printArray
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

    function multiselect (value, schema) {
      var list = AdpFieldsService.getListOfOptions(schema.list);

      var items = _.map(value, function (v) {
        var found = _.find(list, function(listItem) {
          return listItem.value === v.toString();
        });

        return found.label;
      });

      return !!items.length ? items.join(', ') : '-';
    }

    function select (value, schema) {
      if (_.isUndefined(value) || _.isNull(value)) return '-';

      var list = AdpFieldsService.getListOfOptions(schema.list);
      var item = _.find(list, function(i) {
        return i.value === value.toString();
      });

      if (item) {
        return item.label || item;
      } else {
        return '-';
      }
    }

    function selectMultiple(value, schema) {
      if (_.isUndefined(value) || _.isNull(value) || _.isEmpty(value)) return '-';

      // TODO: fix
      return JSON.stringify(value);
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

    function lookupLabel(value) {
      if (_.isUndefined(value) || _.isNull(value) || _.isEmpty(value)) {
        return '-';
      } else {
        return value.label || value._id;
      }
    }

    function lookupMultiple(value) {
      if (_.isEmpty(value)) {
        return '-';
      } else {
        return value.map(function (v) {
          return v.table + ' | ' + (v.label || v._id);
        }).join('\n');
      }
    }

    function showLabel(value, _schema, fullVal, fieldName) {
      if (_.isUndefined(value)) {
        return '-';
      } else {
        return fullVal[fieldName + '_label'] || value;
      }
    }

    function boolean (value) {
      var iconName = value ? 'check' : 'times';

      return [
        '<i class="fa fa-' + iconName + '"></i>',
        // make searchable
        '<span class="hidden">' + value + '</span>'
      ].join('');
    }

    function showImperialUnit(value, schema) {
      if (_.isUndefined(value) || value === 0) {
        return '-';
      }

      var units = AdpFieldsService.getUnits(schema.subtype);
      var valueArray = _.isArray(value) ? value : [value];

      var valueWithUnits = _.map(units, function(unit, index) {
        return valueArray[index] + unit.label
      });

      return valueWithUnits.join(' ');
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

      var isEmpty = value === '' || _.isUndefined(value) || _.isNull(value) ||
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
      var yaml = ['<pre class="yaml">', json2yaml(cleaned, 2), '</pre>'].join('');

      return _.isEmpty(cleaned) ? '-' : yaml;
    }

    function printArray(arrayOfValues, schema) {
      if (_.isNull(arrayOfValues)) {
        return '-';
      }
      var formatted =_formatArray(arrayOfValues, schema);
      var cleaned = ObjectUtil.cleanDeep(formatted);
      var yaml = ['<pre class="yaml">', json2yaml(cleaned, 2), '</pre>'].join('');

      return _.isEmpty(cleaned) ? '-' : yaml;
    }

    function printStringArray(strings) {
      if (_.isEmpty(strings)) {
        return '-';
      }
      return strings.join(', ')
    }
  }
})();
