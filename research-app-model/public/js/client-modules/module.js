;(function () {
    "use strict";

    angular
        .module('app.clientModules', [])
        .controller('ParticipantsPageController', ParticipantsPageController)
        .controller('AnswersPageController', AnswersPageController);

    /** @ngInject */
    function ParticipantsPageController(
      HcGeneratorModalService,
      HcNotificationService,
      HcFieldFormatUtil,
      HcModalService,
      HcDataService,
      SCHEMAS,
      $state,
      $http,
      CONSTANTS
    ) {
      var vm = this;
      vm.pageParams = {
        fieldName: "participants",
        hasDetails: true,
        link: "/participants",
        schemaPath: "participants",
        title: "Participants De-Identified Personal Health Information (PHI)"
      };

      vm.schema = _.clone(_.get(SCHEMAS, vm.pageParams.schemaPath));

      vm.fields = vm.schema.fields;
      vm.loading = true;

      vm.resourceUrl = HcDataService.getResourceUrl(vm.pageParams.link);

      vm.hasDetails = vm.pageParams.hasDetails;
      vm.poolParams = {
        name: ''
      };

      vm.filteredData = [];

      vm.selectedOptions = {
        formatResult: HcFieldFormatUtil.formatSelectLabel,
        formatSelection: HcFieldFormatUtil.formatSelectSelection
      };

      angular.extend(vm, {
        create: createRecord,
        update: updateRecord,
        'delete': deleteRecord,
        createPool: createPool
      });

      function getPageData() {
        return HcDataService.getData(vm.pageParams.link)
          .then(function (response) {
            vm.pageData = response.data.data;

            vm.loading = false;
          });
      }
      getPageData();

      // Check state param addRecord, open add popup if true
      if ($state.params.addRecord) {
        vm.create();
        $state.params.addRecord = null;
      }

      function createPool() {
        var data = {
          name: vm.poolParams.name,
          guids: vm.filteredData.map(function (dataItem) {
            return dataItem.guid;
          })
        };

        $http.post([CONSTANTS.apiUrl, 'create-pool'].join('/'), data)
          .then(function (response) {
            var message = ['Pool', response.data.data.poolName, 'has been created.'].join(' ');
            HcNotificationService.notifySuccess(message);
          });
      }

      // Actions definition
      function createRecord() {
        var options = {
          actionType: 'create',
          fields: vm.fields,
          link: vm.pageParams.link
        };

        HcGeneratorModalService.formModal(options)
          .then(getPageData)
          .then(showMessage);
      }

      function updateRecord(data) {
        var options = {
          actionType: 'update',
          fields: vm.fields,
          link: vm.pageParams.link,
          data: _.clone(data),
          id: data._id
        };

        HcGeneratorModalService.formModal(options)
          .then(getPageData)
          .then(showMessage);
      }

      function deleteRecord(data) {
        var options = {
          message: 'Are you sure that you want to delete this record?'
        };

        HcModalService.confirm(options)
          .then(function () {
            return HcDataService.deleteRecord(vm.pageParams.link, data._id);
          })
          .then(getPageData)
          .then(showDeleteMessage);
      }

      function showMessage() {
        var message = vm.isNewRecord ? ' successfully added.' : ' successfully updated.';
        HcNotificationService.notifySuccess(vm.schema.fullName + message);
      }

      function showDeleteMessage() {
        HcNotificationService.notifySuccess(vm.schema.fullName + ' successfully deleted.');
      }
    }

    /** @ngInject */
    function AnswersPageController($http, $state) {
        var vm = this;
        vm.data = $state.current.data;
        vm.loading = true;

        getPageData()
            .then(onSuccess);

        function getPageData() {
            var params = {
                method: 'GET',
                url: 'https://hc-research-backend-dev.conceptant.com/questionnaires-answers'
            };

            return $http(params);
        }

        function onSuccess(response) {
            vm.loading = false;
            vm.tableData = formatData(response.data.data);
        }

        function formatData(data) {
            var pickFields = ['questionnaireName', 'guid', 'questionnaire'];

            return _.map(data, function (dataItem) {
                var newItem = _.pick(dataItem, pickFields);
                newItem['questionnaire'] = questionsToHTML(newItem['questionnaire']);
                return newItem;
            });
        }

        function questionsToHTML(questions) {
            return _.map(questions, function (question) {
                return [
                    '<b>' + question.fullName + ':</b> ',
                    question.question,
                    '<br>',
                    '<b>Answer:</b> ',
                    question.answer ? question.answer.toString() : '-'
                ].join('');
            }).join('<br><br>');
        }
    }
})();