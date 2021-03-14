;(function () {
  'use strict';

  angular
    .module('app.adpCommon')
    .factory('LookupBtns', LookupBtns);

  /** @ngInject */
  function LookupBtns(
    GraphqlCollectionQuery,
    AdpSchemaService,
    ActionsHandlers,
    GraphqlLookupQuery
  ) {
    return {
      getFieldButtons: getFieldButtons,
      updateButton: updateButton,
    }

    function getFieldButtons(opts, args) {
      return [{
        name: 'Create record',
        options: {
          icon: 'plus',
          elementAttr: {
            class: 'adp-lookup-create-button',
            'lookup-action': 'create',
          },
          onClick: function () {
            createAction(opts, args);
          },
        }
      }, 'clear', 'dropDown']
    }

    function createAction(opts, args) {
      var schema = AdpSchemaService.getSchemaByName(opts.selectedTableName);
      var lookupInstance = getLookupInstance(args);

      lookupInstance.close();
      ActionsHandlers.create(schema)
        .then(function (resp) {
          return getDataSource(args).reload()
            .then(function () {
              return resp.data;
            })
        })
        .then(function (respData) {
          updateLookupValue({ _id: respData._id, table: schema.schemaName }, args);
        });
    }

    function updateButton(data, args) {
      var button = $('<button type="button" lookup-action="update" style="background-color: #ccc;" class="btn btn-sm"><i class="fa fa-edit"></i></button>');

      button.on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var lookupInstance = getLookupInstance(args);

        lookupInstance.close();
        updateLookupHandler(data, args)
          .then(function () {
            getDataSource(args).reload();
          })
          .then(function () {
            if (!inSelectedValue(data, args)) {
              return;
            }

            updateLookupValue(data, args);
          });
      });

      return button;
    }

    function updateLookupHandler(data) {
      var schema = AdpSchemaService.getSchemaByName(data.table);

      return GraphqlCollectionQuery(schema, { filter: ['_id', '=', data._id] })
        .then(function (records) {
          return ActionsHandlers.update(schema, records.items[0]);
        });
    }

    function getLookupInstance(args) {
      var instanceName = args.fieldSchema.type === 'LookupObjectID[]' ? 'dxTagBox' : 'dxSelectBox';
      var fieldName = args.fieldSchema.fieldName;

      // todo search relative to form for schema
      var el = $('[ng-field-name="' + fieldName +'"] [lookup-selector]');
      return el[instanceName]('instance');
    }

    function getDataSource(args) {
      return getLookupInstance(args).option('dataSource');
    }

    function updateLookupValue(data, args) {
      var requestParams = {
        selectedTable: args.fieldSchema.lookup.table[data.table],
        dxQuery: ['_id', '=', data._id],
      }

      return GraphqlLookupQuery(args, requestParams)
        .then(function (records) {
          setLookupValue(records.items[0], args);
        });
    }

    function inSelectedValue(data, args) {
      var listOfValues = getLookupValue(args);
      return !!_.find(listOfValues, ['_id', data._id]);
    }

    function getLookupValue(args) {
      var lookupInstance = getLookupInstance(args);
      var value = lookupInstance.option('value');
      return _.isArray(value) ? value : [value];
    }

    function setLookupValue(newValue, args) {
      var lookupInstance = getLookupInstance(args);

      if (args.fieldSchema.type === 'LookupObjectID') {
        lookupInstance.option('value', newValue);
      } else {
        var prevValue = getLookupValue(args);
        var updateIndex = _.findIndex(prevValue, ['_id', newValue._id]);

        if (updateIndex < 0) {
          prevValue.push(newValue);
        } else {
          prevValue[updateIndex] = newValue;
        }

        lookupInstance.option('value', prevValue);
      }

      setTimeout(function () {
        lookupInstance.repaint();
      });
    }
  }
})();
