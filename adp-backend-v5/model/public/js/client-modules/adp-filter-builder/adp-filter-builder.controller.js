(function () {
    "use strict";

    angular.module("app.adpFilterBuilder").controller("AdpFilterBuilderController", AdpFilterBuilderController);

    var DX_FB_GROUP_CLASS = ".dx-filterbuilder-group";
    var DX_FB_GROUP_ITEM_CLASS = DX_FB_GROUP_CLASS + "-item";
    var DX_FB_GROUP_CONTENT_CLASS = DX_FB_GROUP_CLASS + "-content";

    var valueTypeEditors = {
      default: {
        title: "Regular value",
      },
      relativeDate: {
        supports: ["DateTime", "Date"],
        title: "Relative date",
      },
      databaseField: {
        excludeOperations: ["contains", "notcontains"],
        title: "Database Field"
      },
      mongoExpression: {
        excludeOperations: ["between"],
        title: "Mongo expression"
      },
    }

    /** @ngInject */
    function AdpFilterBuilderController(
      $element,
      GridFilters,
      GridFiltersFactory,
      AdpUnifiedArgs,
      AdpModalService
    ) {
      var vm = this;
      var filterBuilder;

      vm.$onInit = doInit;
      vm.save = function () {
        vm.close({$value: filterBuilder && filterBuilder.getFilterExpression() || []});
      };
      vm.exit = function () {
        vm.close({$value: null});
      };
      vm.clear = onClear;

      function onClear() {
        var value = filterBuilder.option("value");

        if (value && value.length || filterBuilder._model.length > 1) {
          AdpModalService.confirm({message: "Are you sure to clear all conditions?", sizeSmall: true})
            .then(function () {
              filterBuilder.option('value', []);
              filterBuilder._model = ["and"];
            })
        }
      }

      function doInit() {
        vm.options = vm.resolve.options;
        vm.grid = vm.options.grid;
        vm.schema = vm.options.schema;

        initFilterBuilder();
      }

      function initFilterBuilder() {
        var firstCall = true;
        var $container = $(".filter-builder-container", $element);
        var params = {
          fields: getFieldsConfiguration(vm.grid.option("columns"), vm.schema)
        };

        params.value = vm.options.value || [];
        /*[
          ["createdAt", "<", {type: "databaseField", value: "updatedAt"}],
          "or",
          ["name", "contains", {type: "default", value: "345"}],
          "or",
          [
            ["creator", "=", {type: "mongoExpression", value: "66777"}],
            ["createdAt", "<>", {type: "relativeDate", value: "this midnight"}]
          ]
        ];*/

        params.onEditorPreparing = function (event) {
          var valueType = (event.value && event.value.type) || "default";
          var setVal = event.setValue;

          // TODO: dangerous assigment potentially can ruin smth, if value passed be reference.
          // TODO: Think about replacing whole 'event' with newly created
          event.value = event.value && event.value.value;

          event.setValue = function (_data, _type) {
            var type = _type || valueType;
            var data = _data;

            // TODO: find better way to avoid this: no more storing current valType into valueType var...
            if (type !== valueType) {
              data = event.value = '';
              valueType = type;

              initValueEditor(event, vm.schema, type);
            }

            setVal({type: type, value: data});
          }

          initValueEditor(event, vm.schema, valueType)
        }

        params.onInitialized = function (event) {
          filterBuilder = event.component;
        }

        params.onContentReady = function (event) {
          if (firstCall) {
            var builderRootGroup = $(">" + DX_FB_GROUP_CLASS, event.element);
            var filterValue = event.component.option("value");

            traverseMongoExpressionRows(builderRootGroup, filterValue);

            firstCall = false;
          }
        }

        $container.dxFilterBuilder && $container.dxFilterBuilder(params);
      }

      function getFieldsConfiguration(columns, schema) {
        var fields = _.map(
          columns,
          function (col) {
            var field = schema.fields[col.dataField];

            if (!field || !field.showInDatatable || !col.allowFiltering) {
              return null;
            }

            col.customizeText =
              function (a) {
                var typedValue = getFilterValue(a.value);

                if (typedValue.type === "default" ) {
                  var fieldName = col.dataField;
                  var formData = null;
                  var value = typedValue.value;

                  if (!_.isNil(value)) {
                    formData = {};
                    formData[fieldName] = value;
                  }

                  var args = AdpUnifiedArgs.getHelperParamsWithConfig({
                    path: fieldName,
                    formData: formData,
                    action: null,
                    schema: schema,
                  });

                  args.params = {asText:true};

                  return  GridFiltersFactory.formatValue({args: args});
                } else {
                  return "[" + valueTypeEditors[typedValue.type].title + "] " + typedValue.value;
                }
             }

            return col;
          });

        return _.compact(fields);
      }

      function initValueEditor(event, schema, valueType) {
        var field = vm.schema.fields[event.dataField];
        var valueTypeSelector = getTypesSelector(field, event, valueType);
        var $el = event.editorElement;

        $el.empty();

        toggleMongoExpressionClass($el.closest(DX_FB_GROUP_ITEM_CLASS), valueType);

        setTypedFilterComponent(event, schema, valueType);

        $el.prepend(valueTypeSelector);
      }

      function setTypedFilterComponent(event, schema, valueType) {
        if (valueType === "default") {
          GridFilters.setFilterComponent(event, schema);
        } else {
          var options = {
            args: GridFilters.unifiedApproachArgs(event, schema),
            schema: schema,
            dataField: event.dataField,
            filterOperation: event.filterOperation,
            onValueChanged: function (filterOptions) {
              event.setValue(filterOptions.value);
            },
            //  placeholder: getPlaceholder(event, schema),
            parentType: event.parentType,
          };

          options.args.modelSchema = {filter: valueType};

          event.cancel = true; // Cancels creating the default editor

          var filterComponent = GridFiltersFactory.create(options);

          filterComponent.getElement().appendTo(event.editorElement);
        }
      }

      function getTypesSelector(field, event, currentValue) {
        var $el = $("<div>").addClass("adp-type-value-selector");
        var $buttonEl = $("<div>");
        var $popupEl = $("<div>").addClass("adp-type-value-selector-menu-box");
        var initialText = "";
        var menuItems = [];

        _.each(valueTypeEditors, function (config, name) {
          if (_.isArray(config.supports) && config.supports.indexOf(field.type) < 0) {
            return;
          }

          if (_.isArray(config.excludeOperations) && config.excludeOperations.indexOf(event.filterOperation) >= 0) {
            return;
          }

          var item = {value: name, text: config.title || ""};

          if (name === currentValue) {
            initialText = item.text || "[no label]";
            item.selected = true;
          }

          menuItems.push(item);
        });

        if (menuItems.length) {
          $el.append($buttonEl);

          $buttonEl.text(initialText)
                   .addClass("adp-type-value-selector-button dx-filterbuilder-text");

          if (menuItems.length > 1) {
            $el.append($popupEl);

            $popupEl.append(
              $("<div>").dxTreeView({
                items: menuItems,
                onItemClick: function (menuEvent) {
                  event.setValue(event.value, menuEvent.itemData.value);
                  $buttonEl.text(menuEvent.itemData.text);

                  $popupEl.hide();
                  menuEvent.event.stopPropagation();
                },
              })
            )

            $buttonEl.click(function () {
              $popupEl.toggle();
            })
          }
        }

        return $el;
      }

      function getFilterValue(val) {
        var ret;
        if (_.isObject(val) && val.type) {
          return val;
        }

        try {
          ret = JSON.parse(val);
          if (!_.isObject(ret) || !ret.type) {
            ret = {type: "default", value: val}
          }
        } catch (e) {
          ret = {type: "default", value: val}
        }

        return ret;
      }

      function traverseMongoExpressionRows(element, expression) {
        if (!expression || !expression.length) {
          return;
        }

        if (expression[0] === "!") {
          traverseMongoExpressionRows(element, expression[1]);
        } else {
          if (_.isString(expression[0])) {
            var val = getFilterValue(expression[2]);

            toggleMongoExpressionClass($(DX_FB_GROUP_ITEM_CLASS, element), val.type);
          } else {
            var $rows = $(">" + DX_FB_GROUP_CONTENT_CLASS + ">" + DX_FB_GROUP_CLASS, element);
            var pointer = 0;

            _.each(expression, function (filterElement) {
              var $row = $rows[pointer];

              if (!_.isString(filterElement)) {
                traverseMongoExpressionRows($row, filterElement);
                pointer++;
              }
            })
          }
        }
      }

      function toggleMongoExpressionClass(elem, type) {
        $(elem).toggleClass("adp-filter-builder-mongo-expression", type === "mongoExpression");
      }
    }
  }
)();
