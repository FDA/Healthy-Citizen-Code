;(function () {
    "use strict";

    angular
        .module('app.clientModules', [])
        .controller('ParticipantsPageController', ParticipantsPageController)
        .controller('AnswersPageController', AnswersPageController)
        .controller('IcdPageController', IcdPageController)
        .directive('multiLevelSelect', MultiLevelSelectDirective);

    /** @ngInject */
    function ParticipantsPageController(AdpGeneratorModalService,
                                        AdpNotificationService,
                                        AdpFieldFormatUtil,
                                        AdpModalService,
                                        AdpDataService,
                                        $state,
                                        $http,
                                        APP_CONFIG) {
        var vm = this;
        var SCHEMAS = window.adpAppStore.appModel();
        vm.pageParams = {
            fieldName: "participants",
            hasDetails: true,
            link: "/participants",
            schemaPath: "participants",
            title: "Participants De-Identified Personal Health Information (PHI)"
        };

        vm.schema = _.clone(_.get(SCHEMAS, vm.pageParams.schemaPath));
        vm.actions = vm.schema.actions;
        vm.formParams = vm.schema.parameters;
        vm.showCreate = !!vm.actions.fields.create;


        vm.fields = vm.schema.fields;
        vm.loading = true;

        vm.resourceUrl = AdpDataService.getResourceUrl(vm.pageParams.link);

        vm.hasDetails = vm.pageParams.hasDetails;
        vm.poolParams = {
            name: ''
        };

        vm.filteredData = [];

        vm.selectedOptions = {
            formatResult: AdpFieldFormatUtil.formatSelectLabel,
            formatSelection: AdpFieldFormatUtil.formatSelectSelection
        };

      vm.actionCbs = {
        'update': updateRecord,
        'delete': deleteRecord,
        'viewDetails': viewDetails,
        'clone': cloneRecord
      };
      vm.create = createRecord;

      function getPageData() {
        return AdpDataService.getData(vm.pageParams, vm.schema)
          .then(function (data) {
            vm.pageData = data;
            vm.loading = false;
          });
      }
      getPageData();

      // Check state param addRecord, open add popup if true
      if ($state.params.addRecord) {
        vm.create();
        $state.params.addRecord = null;
      }

      // Actions definition
      function createRecord() {
        var formParams = _.assign({}, vm.schema.parameters);
        formParams.actionType = 'create';

        var options = {
          fields: vm.fields,
          formParams: formParams,
          link: vm.pageParams.link
        };

        AdpGeneratorModalService.formModal(options)
          .then(getPageData)
          .then(showMessage);
      }

      function cloneRecord(data) {
        var formParams = _.assign({}, vm.schema.parameters);
        formParams.actionType = 'clone';

        var options = {
          fields: vm.fields,
          formParams: formParams,
          link: vm.pageParams.link
        };

        if (!_.isUndefined(data)) {
          options.data = _.cloneDeep(data);
          delete options.data._id;
        }

        AdpGeneratorModalService.formModal(options)
          .then(getPageData)
          .then(showMessage);
      }

      function updateRecord(data) {
        var formParams = _.assign({}, vm.schema.parameters);
        formParams.actionType = 'update';

        var options = {
          fields: vm.fields,
          formParams: formParams,
          link: vm.pageParams.link,
          data: _.cloneDeep(data),
          id: data._id
        };

        AdpGeneratorModalService.formModal(options)
          .then(getPageData)
          .then(showMessage);
      }

      function deleteRecord(data) {
        var options = {
          message: 'Are you sure that you want to delete this record?',
          actionType: 'delete'
        };

        AdpModalService.confirm(options)
          .then(function () {
            return AdpDataService.deleteRecord(vm.pageParams.link, data._id);
          })
          .then(getPageData)
          .then(showDeleteMessage);
      }

        function showMessage() {
            var message = vm.isNewRecord ? ' successfully added.' : ' successfully updated.';
            AdpNotificationService.notifySuccess(vm.schema.fullName + message);
        }

        function showDeleteMessage() {
            AdpNotificationService.notifySuccess(vm.schema.fullName + ' successfully deleted.');
        }

        function viewDetails(itemData) {
            var options = {
                schema: vm.schema,
                itemData: itemData
            };

            AdpGeneratorModalService.detailsModal(options);
        }


        vm.createPool = function createPool() {
            var data = {
                name: vm.poolParams.name,
                guids: _.map(vm.filteredData, function (dataItem) {
                    return dataItem.guid;
                })
            };

            $http.post([APP_CONFIG.apiUrl, 'create-pool'].join('/'), data)
                .then(function (response) {
                    var message = ['Pool', response.data.data.poolName, 'has been created.'].join(' ');
                    AdpNotificationService.notifySuccess(message);
                });
        };
    }

    /** @ngInject */
    function AnswersPageController($filter,
                                   $http,
                                   $state,
                                   APP_CONFIG) {
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
                type: 'bool'
            },
            'readonly': {
                head: 'Readonly',
                type: 'bool'
            }
        }

        var formatters = {
            'string': function (v) {
                // check for falsy, basicly we need for answers field of quiestion
                if (!v || _.isEmpty(v) || _.isNull(v)) {
                    return '-';
                }

                if (_.isArray(v)) {
                    return v.join('');
                }

                return v.toString();
            },
            'html': function (v) {
                var htmlString = _.isArray(v) ? v.join('') : v;
                return $filter('adpEscapeHtml')(htmlString);
            },
            'bool': function (v) {
                var value;
                if (!_.isUndefined(v)) {
                    value = v === '1';
                } else {
                    value = false;
                }

                return value;
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
        }

        function formatData(data) {
            return _.map(data, function (dataItem) {
                var newItem = {};
                var questionKey = _.keys(dataItem.questionnaire)[0];
                var question = dataItem.questionnaire[questionKey];

                _.each(questionnaireProps, function (field, key) {
                    var value = formatters[field.type](dataItem[key]);
                    newItem[field.head] = value;
                });

                _.each(questionProps, function (field, key) {
                    var value = formatters[field.type](question[key]);
                    newItem[field.head] = value;
                });

                return newItem;
            });
        }
    }

    /** @ngInject */
    function IcdPageController($http,
                               $state,
                               APP_CONFIG,
                               $timeout) {
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