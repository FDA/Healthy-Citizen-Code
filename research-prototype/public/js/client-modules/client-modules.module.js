;(function () {
  "use strict";

  angular
    .module('app.clientModules', [])
    .controller('ParticipantsPageController', ParticipantsPageController)
    .controller('AnswersPageController', AnswersPageController)
    .controller('IcdPageController', IcdPageController)
    .directive('multiLevelSelect', MultiLevelSelectDirective);

  /** @ngInject */
  function ParticipantsPageController(
    MultiRecordPageService,
    AdpSchemaService,
    APP_CONFIG,
    $location,
    AdpNotificationService,
    ErrorHelpers,
    $http
  ) {
    var vm = this;
    vm.schema = AdpSchemaService.getSchemaByName('participants');
    MultiRecordPageService(vm.schema, $location.search());

    vm.isUser = !lsService.isGuest();
    vm.addParticipantsToPool = function createPool() {
      var data = {
        name: vm.poolParams.name,
        participantsFilter: getGridFilter(),
      };

      vm.sending = true;
      $http.post(APP_CONFIG.apiUrl + '/add-participants-to-pool', data)
        .then(function (response) {
          var message = ['Pool "', vm.poolParams.name, '" has been created.'].join('');
          AdpNotificationService.notifySuccess(message);
        })
        .catch(function (err) {
          ErrorHelpers.handleError(err, 'Unable to create pool.');
        })
        .finally(function () {
          vm.sending = false;
        });
    };

    function getGridFilter() {
      var instance = $('[dx-data-grid]').dxDataGrid('instance');
      return instance.getCombinedFilter();
    }
  }

  /** @ngInject */
  function AnswersPageController(
    $http,
    $state,
    APP_CONFIG
  ) {
    var vm = this;
    var columns = {
      questionnaireName: {
        head: 'Questionnaire Name',
        type: 'string',
        path: 'questionnaireName',
      },
      guid: {
        head: 'User Guid',
        type: 'string',
        path: 'guid',
      },
      fullName: {
        head: 'Question Name',
        type: 'string',
        path: 'fullName',
        questionPart: true,
      },
      question: {
        head: 'Question',
        type: 'html',
        path: 'fullName',
        questionPart: true,
      },
      answer: {
        head: 'Answer',
        type: 'string',
        path: 'answer',
        questionPart: true,
      },
      required: {
        head: 'Required',
        type: 'boolean',
        path: 'required',
        questionPart: true,
      },
      readonly: {
        head: 'Readonly',
        type: 'boolean',
        path: 'immutable',
        questionPart: true,
      },
    }
    // firstQuestion from dataItem.questionnaire
    var formatters = {
      string: function (v) {
        if (_.isNil(v) || _.isEmpty(v)) {
          return '-';
        }

        if (_.isArray(v)) {
          return v.join('');
        }

        return _.toString(v);
      },
      html: function (v) {
        return _.isArray(v) ? v.join('') : v;
      },
      boolean: function (v) {
        return v === true;
      },
    }

    vm.data = $state.current.data;
    vm.loading = true;
    getPageData()
      .then(function (resp) {
        return onSuccess(resp.data.data, columns);
      });

    function getPageData() {
      var endpoint = [APP_CONFIG.apiUrl, 'questionnaires-answers'].join('/');
      return $http.get(endpoint);
    }

    function onSuccess(respData, columnProps) {
      vm.loading = false;
      vm.tableData = formatData(respData, columnProps);

      vm.tableConfig = {
        filterRow: { visible: true },
        dataSource: vm.tableData,
        columns: _.map(columnProps, function (column, name) {
          return {
            caption: column.head,
            dataField: name,
            dataType: column.type === 'boolean' ? 'boolean' : 'string',
          };
        }),
        wordWrapEnabled: true,
        pager: {
          allowedPageSizes: [10, 50, 100],
          showInfo: true,
          showNavigationButtons: true,
          showPageSizeSelector: true,
          visible: true,
        },
        paging: { pageSize: 10 },
      };

      vm.isEmpty = _.isEmpty(vm.tableData);
    }

    function formatData(data, columns) {
      return _.map(data, function (dataItem) {
        var questionKey = _.keys(dataItem.questionnaire)[0];

        return _.mapValues(columns, function (column) {
          var path = column.questionPart ? ['questionnaire', questionKey, column.path] : column.path;
          return formatters[column.type](_.get(dataItem, path));
        });
      });
    }
  }

  /** @ngInject */
  function IcdPageController(
    $http,
    $state,
    APP_CONFIG,
    $timeout
  ) {
    var vm = this;
    vm.loading = true;
    vm.pageParams = $state.current.data;
    vm.tableData = [];
    vm.icdData = [];

    function getPageData() {
      var endpoint = [APP_CONFIG.apiUrl, 'public/icd.json'].join('/');

      return $http.get(endpoint);
    }

    getPageData()
      .then(onSuccess);

    function onSuccess(response) {
      vm.loading = false;
      vm.icdData = response.data;
    }

    vm.onSelectChange = createTableConfig;

    function createTableConfig(data) {
      vm.tableData = data;
      vm.tableConfig = {
        filterRow: { visible: true },
        dataSource: vm.tableData,
        wordWrapEnabled: true,
        pager: {
          allowedPageSizes: [10, 50, 100],
          showInfo: true,
          showNavigationButtons: true,
          showPageSizeSelector: true,
          visible: true,
        },
        paging: { pageSize: 10 },
      };
    }
  }

  function MultiLevelSelectDirective($compile) {
    return {
      restrict: 'E',
      template: '<div ng-model="selected" dx-select-box="config"></div>',
      scope: {
        onChange: '=?',
        collection: '=?'
      },
      link: function (scope, element) {
        var childScope;
        var childTemplate = '<multi-level-select data-child></multi-level-select>';

        (function init() {
          scope.selected = null;
          scope.collection = scope.collection || scope.$parent.collection;
          scope.onChange = scope.onChange || scope.$parent.onChange;

          scope.config = {
            items: scope.collection.map(function (v, i) {
              return { value: i, label: v.name };
            }),
            valueExpr: 'value',
            displayExpr: 'label',
            elementAttr: {
              'class': 'adp-select-box',
            },
          };

          scope.$watch('selected', onChange)
        })();

        function onChange(oldVal, newVal) {
          if (_.isNil(scope.selected)) return;
          scope.next = scope.collection[scope.selected].next;

          if (scope.next.type === 'leaf') {
            scope.onChange(scope.next.data);
          } else {
            render();
            scope.onChange([]);
          }
        }

        function render() {
          if (childScope) {
            destroyChildScope();
          }

          childScope = scope.$new(true);
          childScope.collection = scope.next;
          childScope.onChange = scope.onChange;

          element.append($compile(childTemplate)(childScope));
        }

        function destroyChildScope() {
          var childNode = element.find('[data-child]');
          childScope.$destroy();
          childNode.empty();
        }
      }
    }
  }

})();
