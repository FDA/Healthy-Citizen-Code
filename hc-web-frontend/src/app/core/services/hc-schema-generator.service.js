(function ()
{
    'use strict';

    angular
        .module('app.core')
        .provider('hcSchemaGeneratorService', hcSchemaGeneratorService);

    /** @ngInject */
    function hcSchemaGeneratorService($stateProvider, msNavigationServiceProvider, hcSchemaServiceProvider)
    {
        // SERVICE
        var service = this;

        service.handleInterface = handleInterface;

        // PROVIDER
        this.$get = function (hcSchemaServiceProvider) {
            var service = {
                handleInterface : handleInterface
            };

            return service;
        }


        //////////////////////////////////////////////

        var buildedRoutes = [];
        function handleInterface (routeParams, parentKey) {

            _.each(routeParams.fields, function (field, key) {
                var config = {
                    fieldsLen: null,
                    routeParth: null
                };
                var menuPath = (parentKey) ? parentKey + '.' + key : key;
                var menuItemConfig = {
                    title : field.fullName,
                    weight: 3
                }

                if (field.link) {
                    config = createRoutes(field, key, parentKey);
                }

                if (config.fieldsLen) {
                    menuItemConfig.state = 'app.' + config.routeParth
                }

                msNavigationServiceProvider.saveItem(menuPath, menuItemConfig)

                // Recursive call
                handleInterface(routeParams['fields'][key], menuPath)
            })
        };


        /**
         * Local functions
         */
        function createRoutes (field, key, parentKey) {
            var schemaLink = field.link.split('/');
            schemaLink.shift();

            var pathArr = schemaLink;
            schemaLink = schemaLink.join('.fields.');

            var schema = _.at(window.schemas, schemaLink);
            schema = schema[0];

            // TODO: remove this later
            if (!schema) {
                schema = {};
            }


            /**
             * Routing
             */
            var routeName = _.last(pathArr);
            var routeParth = pathArr.join('.');

            var data = {name: routeName};
            var parentGroup;
            if (parentKey) {
                parentGroup = routeParth.split('.');
                parentGroup.pop();

                // TODO: Need to redo this to eluminate errors
                data.isSubform = false;
                data.parent = parentGroup.join('.');
            }

            var fields = _.pickBy(schema['fields'], function (field) {
                return (field.visible !== false && field.type !== 'Subschema');
            });

            var fieldsLen = _.values(fields).length;

            // Core page
            var temaplate = "generator.mainPage.html";
            if (schema.singleRecord) {
                temaplate = "generator.singleRecord.html";
            }

            var routeIndex = _.findIndex(buildedRoutes, function(o) { return o == routeName; });
            if (routeIndex == -1) {
                if (parentGroup) {
                    var parentIndex = _.findIndex(buildedRoutes, function(o) { return o == parentGroup[0]; });

                    if (parentIndex == -1) {
                        $stateProvider.state('app.' + parentGroup[0] , {
                            url     : '/' + parentGroup[0],
                            abstract: true
                        });

                        buildedRoutes.push(parentGroup[0]);
                    }
                }

                buildedRoutes.push(routeName);
                if (fieldsLen) {
                    $stateProvider.state('app.' + routeParth , {
                        url     : '/' + routeName,
                        views: {
                            'content@app': {
                                templateUrl: 'app/main/generator/' + temaplate,
                                controller: 'generatorController as vm'
                            }
                        },
                        params: {
                            'addRecord': null
                        },
                        resolve: {
                            Schema: function () {
                                return schema;
                            },
                            Data: function () {
                                return data;
                            }
                        }
                    });

                } else {  
                    $stateProvider.state('app.' + routeParth , {
                        url     : '/' + routeName,
                        abstract: true
                    });
                }

                 // details page
                if (hcSchemaServiceProvider.hasSubforms(schema) && pathArr.length > 1) {

                    $stateProvider.state('app.' + routeParth + '.details',{
                        url: '/id:id',
                        views: {
                            'content@app': {
                                templateUrl: 'app/main/generator/generator.details.html',
                                controller: 'generatorDetailsController as vm'
                            }
                        },
                        resolve: {
                            Schema: function () {
                                return schema;
                            },
                            Data: function () {
                                return  {
                                    name: key,
                                    parent: parentGroup
                                };
                            }
                        },
                        params: {
                            tab: null
                        }
                    });
                }

            };

            return {
                fieldsLen: fieldsLen,
                routeParth: routeParth
            };
        }

        function camelCaseFilter (value) {
            return value.replace(/([A-Z])/g, ' $1')
                .replace(/^./, function(str){ return str.toUpperCase() })
        }


    };
})();
