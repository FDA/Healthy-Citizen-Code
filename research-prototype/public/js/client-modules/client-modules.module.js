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
    var questionnaireProps = {
      'questionnaireName': {
        head: 'Questionnaire Name',
        type: 'string'
      },
      'guid': {
        head: 'User Guid',
        type: 'string'
      }
    }

    var questionProps = {
      'fullName': {
        head: 'Question Name',
        type: 'string'
      },
      'question': {
        head: 'Question',
        type: 'html'
      },
      'answer': {
        head: 'Answer',
        type: 'string'
      },
      'required': {
        head: 'Required',
        type: 'boolean'
      },
      'readonly': {
        head: 'Readonly',
        type: 'boolean'
      }
    }

    var formatters = {
      'string': function (v) {
        if (_.isNil(v) || _.isEmpty(v)) {
          return '-';
        }

        if (_.isArray(v)) {
          return v.join('');
        }

        return v.toString();
      },
      'html': function (v) {
        return _.isArray(v) ? v.join('') : v;
      },
      'boolean': function (v) {
        return v === '1';
      }
    }

    vm.data = $state.current.data;
    vm.loading = true;
    getPageData()
      .then(onSuccess);

    function getPageData() {
      var endpoint = [APP_CONFIG.apiUrl, 'questionnaires-answers'].join('/');
      return $http.get(endpoint);
    }

    function onSuccess(response) {
      vm.loading = false;
      vm.tableData = formatData(response.data.data);

      vm.tableConfig = {
        filterRow: { visible: true },
        dataSource: vm.tableData,
        columns: Object.keys(vm.tableData[0]).map(function (columnName) {
          var columnProps = questionnaireProps[columnName] || questionProps[columnName];

          return {
            caption: columnProps.head,
            dataField: columnName,
            dataType: columnProps.type === 'boolean' ? 'boolean' : 'string',
          }
        }),
        wordWrapEnabled: true,
      };

      console.log(vm.tableConfig)
      vm.isEmpty = _.isEmpty(vm.tableData);
    }

    function formatData(data) {
      return _.map(data, function (dataItem) {
        var newItem = {};
        var questionKey = _.keys(dataItem.questionnaire)[0];
        var question = dataItem.questionnaire[questionKey];

        _.each(questionnaireProps, function (field, key) {
          var value = formatters[field.type](dataItem[key]);
          newItem[key] = value;
        });

        _.each(questionProps, function (field, key) {
          var value = formatters[field.type](question[key]);
          newItem[key] = value;
        });

        return newItem;
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

    vm.onSelectChange = function (data) {
      // WORKAROUND: to redraw table
      if (data.length) {
        vm.tableData = [];
      }
      $timeout(function () {
        vm.tableData = data
      });
    }
  }

  function MultiLevelSelectDirective($compile) {
    var template = [
      '<div>' +
      '<select',
      'adp-select2',
      'class="form-control"',
      'style="width: 100%; padding: 0; margin-bottom: 10px; height: 34px;"',
      'ng-model="selected">',
      '<option value=""></option>',
      '<option',
      'ng-repeat="item in listOfValues track by $index"',
      'value="{{item.value}}">',
      '{{item.label}}',
      '</option>',
      '</select>',
      '</div>'
    ].join(' ');

    return {
      restrict: 'E',
      template: template,
      scope: {
        onChange: '=?',
        collection: '=?'
      },
      link: function (scope, element) {
        var childScope;
        var template = '<multi-level-select data-child></multi-level-select>';

        (function init() {
          scope.selected = '';
          scope.collection = scope.collection || scope.$parent.collection;
          scope.onChange = scope.onChange || scope.$parent.onChange;

          scope.listOfValues = scope.collection.map(function (v, i) {
            return {
              value: i,
              label: v.name
            }
          });

          // hiding search input
          // https://github.com/select2/select2/issues/489#issuecomment-100602293
          if (scope.listOfValues.length < 10) {
            scope.options = {minimumResultsForSearch: -1}
          }

          scope.$watch('selected', onChange)
        })();

        function onChange() {
          if (!scope.selected) return;
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

          element.append($compile(template)(childScope));
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
