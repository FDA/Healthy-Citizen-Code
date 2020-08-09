(function() {
    angular
        .module('app.generator')
        .controller('generatorController', generatorController);

    /* @ngInject */
    function generatorController($scope, $rootScope, $state, $stateParams, $http, $filter, $q, $mdDialog, DTOptionsBuilder, DTColumnBuilder, DTColumnDefBuilder, hcSchemaService, hcUtilsService, hcFlashService, hcErrorsHandler, CONSTANTS, Schema, Data) {

        // Data
        var vm = this;
        var url = hcSchemaService.stateToUrl($state.current.name, Data.parent, Data.name);

        if ($stateParams.id) {
            url = url.replace('details', $stateParams.id);
        }

        vm.Schema = Schema;
        vm.parsedSchema = hcSchemaService.parseSchema(vm.Schema);
        vm.heads = vm.parsedSchema.heads;
        vm.currentPage = Data.name;

        vm.newItem = {};

        vm.isChild = false;
        vm.isSubform = Data.isSubform;
        vm.isParent = hcSchemaService.hasSubforms(vm.Schema);
        vm.detailsPage = $state.current.name + '.details';
        vm.recordLimit = vm.Schema.singleRecord;
        vm.serverSide = vm.Schema.serverSide;

        vm.isEmpty = _.isEmpty;
        hcSchemaService.iterateSubform(vm.Schema);


        /////////////
        // Methods //
        /////////////
        vm.addSchema = vm.Schema;

        // Getting data
        function getPageData () {
            var getUrl = url;
            if (!Data.parent || vm.Schema['singleRecord']) {
                getData(getUrl);
                return;
            }

            var parentRoute = Data.parent.split('.').join('.fields.');

            if (_.at(window.schemas, parentRoute)[0]['singleRecord']) {
                getData(getUrl);
                return;
            }

            vm.isChild = true;

            getUrl = url.split('/');
            var itemName = getUrl.pop();

            getUrl = getUrl.join('/');

            // getting nested data, 3rd level
            $http.get(CONSTANTS.apiUrl + getUrl)
                .then(function (response) {
                    vm.parentData = response.data.data;
                    if (_.isArray(vm.parentData)) {

                        vm.pageData = _.flatMap(vm.parentData, function(element) {
                            _.each(element[itemName], function (val, i) {
                                element[itemName][i]['_parentId'] = element['_id'];
                            });

                            return element[itemName];
                        });
                    } else {
                        vm.pageData = vm.parentData[itemName];
                    }

                });

            var pathToParent = Data.parent.split('.').join('.fields.');

            vm.parentSchema = _.at(window.schemas, pathToParent)[0];
        };
        getPageData();


        /**
         * getData - Getting page data
         *
         * @param  {String} getUrl        url to GET request
         */
        function getData (getUrl) {
            $http.get(CONSTANTS.apiUrl + getUrl)
                .then(function (response) {
                    vm.pageData = response.data.data;
                    if (vm.Schema.singleRecord && _.isArray(vm.pageData)) {
                        vm.pageData = vm.pageData[0];
                    }

                    vm.formData = angular.copy(vm.pageData);

                    if (vm.isEmpty(vm.formData)) vm.formData = {};
                })
        }




        /**
         * Add Record
         *
         * @param {object} data - data to add
         * @param {string} url
         */
        vm.add = function (data, parentId) {
            var addData = {"data": hcSchemaService.removeEmptyArrays(data)};
            var addUrl = generateUrl(url, parentId);

            $http.post(addUrl, addData).then(
                function(response) {
                    $state.go($state.current, {}, {reload: true})
                        .then(function () {
                            $mdDialog.hide();
                            hcFlashService.success(vm.currentPage + ' successfully added');
                        });
                }, function(error) {
                    hcErrorsHandler.handle(error);
                }
            );
        };

        /**
         * Update record
         *
         * @param  {Array} data     - data to add
         * @param  {string} id       - record id
         * @param  {string} parentId - id of parent record (OPTIONAL)
         */
        vm.update = function (data, id, parentId, newParentId) {
            var updateData = {"data": hcSchemaService.updatePresenter(data)};
            var updateUrl = generateUrl(url, parentId);

            updateData = hcSchemaService.removeEmptyArrays(updateData);

            if (newParentId !== parentId) {
                vm.changeParent(updateUrl, id, newParentId, updateData);
            } else {
                if (!window.ids[Data.name]) {
                    updateUrl += '/' + id
                }
                $http.put(updateUrl, updateData).then(
                    function(response) {
                        $state.go($state.current, {addRecord: false}, {reload: true})
                            .then(function () {
                                $mdDialog.hide();
                                hcFlashService.success(vm.currentPage + ' successfully Updated');
                            });
                    }, function(error) {
                        hcErrorsHandler.handle(error);
                    }
                );
            }
        };


        /**
         * anonymous function - description
         *
         * @param  {String} url         base item URl
         * @param  {String} id          item ID
         * @param  {String} newParentId new parent ID
         * @param  {Object} addData     item data
         */
        vm.changeParent = function (url, id, newParentId, addData) {
            var deleteUrl = url + '/' + id;
            var addUrl = generateUrl(url, newParentId, true);

            // delete current record...
            $http.delete(deleteUrl).then(
                function (response) {
                    _.unset(addData, '_id');
                    _.unset(addData, '_parentId');
                    addData = {'data': addData};

                    // then create the same record, but with different parent
                    $http.post(addUrl, addData).then(
                        function (response) {
                          $mdDialog.hide();
                            hcFlashService.success('Parent record was changed');
                        },
                        function (error, status) {
                            hcErrorsHandler.handle(error);
                        }
                    );
                }, function (error, status) {
                    hcErrorsHandler.handle(error);
                })
        };

        /**
         * Generating URL's for Create/Update/Delete methods
         * @param  {String} id       - id of element
         * @param  {String} parentId - parent id (OPTIONAL)
         * @param  {Boolean} replace - flag, if true we need to remove pre-last item and insert parentId on this place, otherwise just add item
         */
        function generateUrl (url, parentId, replace) {
            var updatedUrl = url;
            if (url.substring(0, 4) !== 'http') {
                updatedUrl = CONSTANTS.apiUrl + updatedUrl;
            }

            if (parentId) {
                var tempUrl = updatedUrl.split('/');
                // replace or just add item in the end depends on it
                var removeItem = replace ? 1 : 0;
                tempUrl.splice(tempUrl.length - 1 - removeItem, removeItem, parentId);
                return tempUrl.join('/');
            }

            return updatedUrl;
        };

        /**
         * Delete record
         *
         * @param  {Event}  ev       mdModal
         * @param  {String} id       record id
         * @param  {String} parentId parent record ID
         */
        vm.openDelete = function(ev, id, parentId) {
            // Appending dialog to document.body to cover sidenav in docs app
            var confirm = $mdDialog.confirm()
                .title('Are you sure that you want to delete this record?')
                .parent(angular.element(document.body))
                .targetEvent(ev)
                .clickOutsideToClose(true)
                .ok('Yes')
                .cancel('Cancel');

            $mdDialog.show(confirm).then(function() {
                // Delete record
                var deleteUrl = generateUrl(url, parentId);

                if (id) {
                    deleteUrl += ('/' + id);
                }

                $http.delete(deleteUrl).then(
                    function (response) {
                        hcUtilsService.changeTab(null, 'Record successfully removed');
                    },
                    function (error, status) {
                        hcErrorsHandler.handle(error);
                    }
                );
            });
        };


        vm.showAddDialog = function(ev, action, id, parentId, item) {
            vm.action = action;
            vm.updateItem = item;

            vm.actionOptions = {
                id: id,
                parentId: parentId,
                item: item
            };

            $mdDialog.show({
                controller: AddDialogController,
                templateUrl: 'app/main/generator/generator.addDialog.tmpl.html',
                parent: angular.element(document.body),
                targetEvent: ev,
                clickOutsideToClose:true
            })
            .then(function(data) {
                // vm[action](data, id, paretnId, item);
            }, function() {
                vm.status = 'You cancelled the dialog.';
            });
        };


        if ($stateParams.addRecord) {
            vm.showAddDialog(null, 'add');
        }


        /**
         * Check for subpage and change state to details page if it's exist
         * @param  {[type]} id
         * @return {[type]}    [description]
         */
        vm.goToDetails = function (id) {
            if (!vm.parsedSchema.forms.length && vm.isSubform) return;

            $state.go(vm.detailsPage, {id: id});
        };

        /**
         * Redirect to special subform
         * @param  {string} id   - id of subform
         * @param  {string} form - name of the form
         */
        vm.openSubform = function (id, form) {
            $state.go(vm.detailsPage + '.' + form, {id: id});
        };

        /**
         * Add Modal Controller
         */
        function AddDialogController($scope, $mdDialog) {
            $scope.Schema = vm.Schema;
            $scope.action = vm.action;
            $scope.isChild = vm.isChild;

            $scope.parentSchema = vm.parentSchema;

            $scope.wizardForm = {};
            $scope.wizardForm.selectedParentId = vm.actionOptions.parentId;
            $scope.LabelRenderers = appModelHelpers.LabelRenderers;

            $scope.addParentMenu = false;
            $scope.parentFormData = {};

            if (vm.action == 'update') {
                // Update
                $scope.formData = angular.copy(vm.updateItem);
            } else {
                // Add
                $scope.formData = {};
                hcSchemaService.iterateSubform(vm.Schema);
            }

            if (vm.isChild) {
                $scope.parentsList = vm.parentData;
            }

            /**
             * Toggle add parent menu.
             */
            $scope.toggleAddParent = function () {
                $scope.addParentMenu = !$scope.addParentMenu;
            };

            /**
             * Hide dialog
             */
            $scope.hide = function() {
                $mdDialog.hide();
            };

            /**
             * Dismiss dialog
             */
            $scope.cancel = function() {
                $mdDialog.cancel();
            };

            /**
             * Create parent record
             */
            $scope.createParent = function () {
                var createParentUrl = _.initial(url.split('/')).join('/');

                $http.post(CONSTANTS.apiUrl + createParentUrl, {'data': $scope.parentFormData}).then(
                    function(response) {
                        $scope.addParent = false;
                        hcFlashService.success(vm.parentSchema.labelRenderer + ' successfully Added');

                        // TODO: redo this after API will start to return added records
                        $http.get(CONSTANTS.apiUrl + createParentUrl)
                            .then(function (resp) {
                                $scope.parentsList = resp.data.data;
                            });
                        $scope.parentFormData = {};

                        $scope.addParentMenu = false;
                    }, function(error) {
                        hcErrorsHandler.handle(error);
                    }
                );
            };


            /**
             * Update record / update or delete, call propriate method with attributes
             */
            $scope.updateRecord = function() {
                if ($scope.action == 'add') {
                    vm.add($scope.formData, $scope.wizardForm.selectedParentId);
                } else {
                    vm.update($scope.formData, vm.actionOptions.id, vm.actionOptions.parentId, $scope.wizardForm.selectedParentId);
                }
            };

        };

        ///////////////////////
        // Datatables config //
        ///////////////////////

        // Parsing Sorting
        $.fn.dataTable.render.ellipsis = function () {
            var stringLimit = 40;
            return function ( data, type, row ) {
                if (!data) return '-';

                return type === 'display' && data.length > stringLimit ?
                    data.substr( 0, stringLimit ) + '…' :
                    data;
            }
        };

        vm.dtOptions = DTOptionsBuilder.newOptions()
            .withOption('autoWidth', false)
            .withOption('autoHeight', true)
            // .withOption('responsive', true)
            .withDOM('Bfrtip')
            .withButtons([
                'copy', 'csv', 'excel', 'pdf', 'print'
            ])
            .withPaginationType('simple_numbers');

        if (vm.Schema.defaultSortBy) {
            var sortingRules = [];
            vm.dtOptions.withOption('order', sortingRules)
            _.each(vm.Schema.defaultSortBy, function (value, key) {
                var sort = value == -1 ? 'desc' : 'asc';
                var index = _.indexOf(vm.heads, key);
                sortingRules.push([index, sort]);
            });
        }


        vm.DTColumnDefs = [];

        _.each(vm.heads, function (value, index) {

            if (value.visible !== false) {
                var def = vm.Schema.fields[value];
                var type = "string";
                if (def.type == 'Number') {
                    type = 'num';
                } else if (def.type == "Date") {
                    type = 'date';
                }
                var column = DTColumnDefBuilder
                    .newColumnDef(index)
                    .withTitle(def.fullName)
                    .withOption('sWidth', def.width + 'px')
                    .withOption('type', type)
                    // .withOption('render', $.fn.dataTable.render.ellipsis());
                vm.DTColumnDefs.push(column);
            }
        });

        var lastCol = DTColumnDefBuilder.newColumnDef(vm.heads.length).notSortable();
        vm.DTColumnDefs.push(lastCol);


        vm.dtSSOptions = DTOptionsBuilder.newOptions()
            .withOption('ajax', {
            url: CONSTANTS.apiUrl + url,
            type: 'GET'
        })
            .withDataProp('data')
            .withOption('processing', true)
            .withOption('serverSide', true)
            .withOption('autoWidth', true)
            // .withOption('responsive', true)
            .withDOM('frtip')
            .withButtons([
                'copy', 'csv', 'excel', 'pdf', 'print'
            ])
            .withPaginationType('full_numbers');

        vm.dtSSColumns = [];
        // populate columns
        _.each(vm.Schema.fields, function (value, key) {
            if (value.visible !== false) {
                var column;
                column = DTColumnBuilder.newColumn(key)
                    .withTitle(value.fullName)
                    // .withOption('sWidth', value.width + 'px')
                    // .withOption('defaultContent', null)
                    // .withOption('render', $.fn.dataTable.render.ellipsis())
                    .withOption('defaultContent', '-')
                    .withOption('type', value.type);
                vm.dtSSColumns.push(column);
            }
        });

    }
})();
