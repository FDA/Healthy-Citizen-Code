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
    DATE_TIME_FORMAT
  ) {
    var typeMap = {
      'String[]': multiselect,
      'Number': showNumber,
      'Select': select,
      'Date': date,
      'Date:Time': date,
      'Date:DateTime': date,
      'Search': showLabel,
      'Search[]': lookupMultiple,
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
      'Mixed': mixed
    };

    // NOTE: value is record object
    return function (value, schema, fieldName) {
      var schemaField = _.get(schema.fields, fieldName);
      var currentVal = value[fieldName];
      var fieldType = AdpSchemaService.getTypeProps(schemaField);

      if (!typeMap[fieldType]) {
        return currentVal || '-';
      }

      return typeMap[fieldType](currentVal, schemaField, value, fieldName);
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

    function date (value, schema) {
      var dateFormats = {
        'Date': DATE_FORMAT,
        'DateTime': DATE_TIME_FORMAT,
        'Time': TIME_FORMAT
      };
      var dateFormat = dateFormats[schema.subtype] || dateFormats['Date'];

      return !!value ? moment(value).format(dateFormat) : '-';
    }

    function showLabel (value, _schema, fullVal, fieldName) {
      if (_.isUndefined(value)) {
        return '-';
      } else {
        return fullVal[fieldName + '_label'];
      }
    }

    function lookupMultiple(value, _schema, fullVal, fieldName) {
      var label = fullVal[fieldName + '_label'];
      if (value.length) {
        return _.isString(label) ? label : label.join(', ');
      } else {
        return '-';
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
  }
})();
