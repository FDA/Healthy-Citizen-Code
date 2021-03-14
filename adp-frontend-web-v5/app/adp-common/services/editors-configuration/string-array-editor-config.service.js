;(function () {
  'use strict';

  angular
    .module('app.adpCommon')
    .factory('StringArrayEditorConfig', StringArrayEditorConfig);

  /** @ngInject */
  function StringArrayEditorConfig() {
    return function (args, initialValue, onValueChangeCb) {
      var fieldData = initialValue || [];

      return {
        showClearButton: true,
        elementAttr: { class: 'adp-select-box' },
        inputAttr: { 'test-field-control-id': args.path },
        acceptCustomValue: true,
        placeholder: 'Type in new value and press Enter',
        openOnFieldClick: false,
        displayExpr: 'label',
        valueExpr: 'id',
        value: _.range(0, fieldData.length),
        dataSource: fieldData.map(function (item, index) {
          return { label: item, id: index };
        }),
        onCustomItemCreating: onItemCreating,
        onValueChanged: function (e) {
          onValueChanged(e);
          var value = getValueForControl(e.component.option('dataSource'));
          onValueChangeCb({ value: value });
        },
        tagTemplate: function tagTemplate(data, tagElement) {
          var component = this;
          var removeBtn = $('<div class="dx-tag-remove-button">');

          removeBtn.on('click', function () {
            var ids = component.option('value').slice();
            _.pull(ids, data.id);

            component.option('value', ids);
            removeBtn.off('click');
          });

          $('<div class="dx-tag-content">')
            .attr('adp-qaid-field-tag', args.path)
            .append('<span>' + data.label + '</span>', removeBtn)
            .appendTo(tagElement);
        }
      };
    }

    function onItemCreating(data){
      if(!data.text) {
        data.customItem = null;
        return;
      }

      var currentItems = data.component.option('dataSource');
      var itemWithMaxId = currentItems.length ?
        currentItems[currentItems.length - 1] :
        { id: -1 };

      var newItem = { label: data.text, id: itemWithMaxId.id + 1 };
      currentItems.push(newItem);

      data.component.option('dataSource', currentItems);
      data.customItem = newItem;
    }

    function onValueChanged(e) {
      var dataSource = e.component.option('dataSource').slice(0);
      _.remove(dataSource, function (item) {
        return !_.includes(e.value, item.id);
      });

      e.component.option('dataSource', dataSource);
    }

    function getValueForControl(valueList) {
      return _.isEmpty(valueList) ? null : _.map(valueList, 'label');
    }
  }
})();
