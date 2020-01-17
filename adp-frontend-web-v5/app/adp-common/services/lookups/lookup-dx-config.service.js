;(function () {
  'use strict';

  angular
    .module('app.adpCommon')
    .factory('LookupDxConfig', LookupDxConfig);

  /** @ngInject */
  function LookupDxConfig(
    AdpLookupHelpers,
    LookupDataSource,
    LookupBtns
  ) {
    return {
      single: singleLookupConfig,
      multiple: multipleLookupConfig,
      tableSelector: tableSelectorConfig,
      filter: filterLookupConfig,
    };

    function defaults(options) {
      return {
        elementAttr: {
          'class': 'adp-select-box adp-lookup-selector'
        },
        value: options.args.data,
        showClearButton: true,
        searchEnabled: true,
        dataSource: LookupDataSource(options.args, options.selectedTableName),
        valueExpr: 'this',
        onValueChanged: options.onValueChanged,
        buttons: LookupBtns(options.selectedTableName),
        itemTemplate: function (lookupData) {
          return AdpLookupHelpers.lookupItemTemplate(lookupData, options.args);
        },
      }
    }

    function singleLookupConfig(options) {
      var defaultsConfig = defaults(options);
      var lookupSingleConfig = {
        onOpened: function (event) {
          // WORKAROUND to set focus on select when dropdown is shown
          event.element.find('.adp-text-box input').focus();
        },
        fieldTemplate: function (data, container) {
          var label = _.isNil(data) ? '' : AdpLookupHelpers.formatLabel(data, options.args);
          var tpl = $('<div class="adp-text-box-label">')
            .append(label);

          var textBox = $('<div class="adp-text-box">')
            .dxTextBox({
              placeholder: this.option('placeholder'),
              value: _.isNil(data) ? '' : data.label,
            });

          container.append(tpl, textBox);
        },
      };

      return _.assign(defaultsConfig, lookupSingleConfig);
    }

    function multipleLookupConfig(options) {
      var defaultsConfig = defaults(options);

      var lookupMultipleConfig = {
        tagTemplate: function (lookupData, tagElement) {
          return tagTemplate({
            lookupData: lookupData,
            tagElement: tagElement,
            args: options.args,
            component: this,
          });
        },
      };

      return _.assign(defaultsConfig, lookupMultipleConfig);
    }

    function tableSelectorConfig(options) {
      var items = getNamesForTables(options.args.modelSchema.lookup);

      return {
        elementAttr: {
          'class': hasSingleTable(items) ? ' hidden' : '',
        },
        value: defaultValue(items),
        dataSource: items,
        onValueChanged: options.onTableChanged,
      };

      function getNamesForTables(lookup) {
        return _.map(lookup.table, function (table) {
          return table.table;
        });
      }

      function defaultValue(items) {
        return items[0];
      }

      function hasSingleTable(items) {
        return items.length === 1;
      }
    }

    function filterLookupConfig(options) {
      var defaultsConfig = defaults(options);

      var filterConfig = {
        value: options.args.data,
        elementAttr: {
          'class': 'adp-select-box adp-lookup-selector adp-filter-lookup-selector'
        },
        itemTemplate: function (lookupData) {
          return AdpLookupHelpers.lookupFilterItemTemplate(lookupData, options.args);
        },
        tagTemplate: function (lookupData, tagElement) {
          return tagTemplate({
            lookupData: lookupData,
            tagElement: tagElement,
            args: options.args,
            component: this,
          });
        },
        buttons: [],
      };

      return _.assign(defaultsConfig, filterConfig);
    }

    function tagTemplate(templateConf) {
      var removeBtn = $('<div class="dx-tag-remove-button">');

      removeBtn.on('click', function () {
        var val = templateConf.component.option('value');
        var itemIndex = _.findIndex(val, function (item) {
          return item._id === templateConf.lookupData._id;
        });

        val.splice(itemIndex, 1);
        templateConf.component.option('value', val);

        removeBtn.off('click');
      });

      var content = $('<span>').html(AdpLookupHelpers.formatLabel(templateConf.lookupData, templateConf.args));

      $('<div class="dx-tag-content">')
        .append(content, removeBtn)
        .appendTo(templateConf.tagElement);
    }
  }
})();
