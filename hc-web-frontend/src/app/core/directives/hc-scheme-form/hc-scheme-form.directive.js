(function () {
    'use strict';

    angular
        .module('app.core')
        .directive('hcSchemeForm', hcSchemeFormDirective);

    function hcSchemeFormDirective ($document, $http, $rootScope, $filter, $compile, CONSTANTS, RecursionHelper, hcErrorsHandler) {
        return {
            restrict: 'E',
            scope: {
                data: '=',
                ngModel: '=',
                model: '@',
                submit: '=',
                title: '@',
                errors: '=',
                hideSubforms: '='
            },
            transclude: true,
            templateUrl: 'app/core/directives/hc-scheme-form/hc-scheme-form.html',
            compile: function (element) {
                return RecursionHelper.compile(element, function (scope, iElement, iAttrs, controller, transcludeFn) {
                    // Define your normal link function here.
                    // Alternative: instead of passing a function,
                    // you can also pass an object with
                    // a 'pre'- and 'post'-link function.
                    scope.schema = scope.data.fields;

                    scope.lists = $rootScope.lists;

                    scope.title = scope.title || '';

                    scope.getDataSize = function (val) {
                        return _.size(val);
                    };

                    scope.getDate = function (date) {
                        return Date.parse(date);
                    };


                    scope.isNestedEnum = function (list) {
                        var keys = _.keys(list);

                        if (!keys[0]) return false;
                        if (list[keys[0]]['name']) {
                            return true;
                        } else {
                            return false;
                        }
                    };
                    scope.multipleModel = {};

                    scope.getFieldType = function (value, key) {
                        // if (!value) return;
                        if (value.lookup) {
                            return 'Lookup';
                        } else if (value.list) {
                            if (value.type == 'String[]') {
                                var unregister = scope.$watch('ngModel', function (newVal, oldVal) {
                                    if (newVal && scope.ngModel && !scope.ngModel[key]) {
                                        scope.ngModel[key] = [];
                                        unregister();
                                    }
                                });
                            }

                            return (value.type == 'String[]') ? 'String[]' : 'Enum';
                        } else if (value.type == 'Number' && value.subtype == 'ImperialHeight') {
                            var unregister = scope.$watch('ngModel', function (newVal, oldVal) {
                                if (newVal && scope.ngModel && !scope.ngModel[key]) {
                                    scope.ngModel[key] = [0, 0];
                                    unregister();
                                }
                            });
                            return 'Height';
                        } else if (value.type) {
                            return value.type;
                        } else {
                            return 'String';
                        }
                    };

                    scope.getPlaceholder = function (value, required) {
                        var placeholder = "";

                        placeholder = $filter('camelCaseToSpace')(value);
                        if (required) {
                            placeholder += " *";
                        }
                        return placeholder;
                    };

                    scope.delegateClick = function (ev) {
                        var target = $(ev.currentTarget).attr('for');
                        $('#' + target + ' input').eq(0).focus();
                    };

                    scope.height = $rootScope.height;

                    // Lookup
                    scope.items = [];
                    scope.page = 1;
                    scope.itemData = {
                        selected: null
                    };

                    var init = true;
                    scope.fetch = function (lookup, $select, $event, label) {
                        var q = $select.search;
                        if (init) {
                            q = label;
                            init = false;
                        }

                        // no event means first load!
                        if (!$event) {
                            scope.page = 1;
                            scope.items = [];
                        } else {
                            $event.stopPropagation();
                            $event.preventDefault();
                            scope.page++;
                        }

                        scope.loading = true;
                        $http({
                            method: 'GET',
                            url: CONSTANTS.apiUrl + 'lookups/' + lookup.id,
                            params: {
                                q: q,
                                page: scope.page
                            }
                        }).then(
                            function (resp) {
                                scope.items = scope.items.concat(resp.data.data);
                                scope.more = resp.data.more;
                            }, function (error, status) {
                                hcErrorsHandler.handle(error);
                            }
                        )['finally'](function () {
                            scope.loading = false;
                        });
                    };


                    scope.validators = {};

                    /**
                     * anonymous function - description
                     *
                     * @param  {type} field     description
                     * @param  {type} fieldName description
                     * @return {type}           description
                     */
                    scope.getValidators = function (field, fieldName) {
                        var fieldClone = _.cloneDeep(field);

                        if (fieldClone.validate) {
                            if (!scope.validators[fieldName]) {
                                scope.validators[fieldName] = {};
                            }

                            _.each(fieldClone.validate, function (validator) {

                                scope.validators[fieldName][validator.validator] = {
                                    arguments: _.values(validator.arguments) || [],
                                    errorMessages: validator.errorMessages
                                };

                                // Not in future
                                if (validator.validator == 'notInFuture') {
                                    scope.validators[fieldName][validator.validator]['arguments'][0] = new Date();
                                }

                                // imperialHeightRange
                                if (validator.validator == 'imperialHeightRange') {
                                    var heightRange = scope.validators[fieldName]['imperialHeightRange']['arguments'];
                                    scope.height[0] = fillArray(heightRange[0][0], heightRange[1][0]);
                                    scope.height[1] = fillArray(heightRange[0][1], heightRange[1][1]);
                                }

                                // Get binded value
                                _.each(scope.validators[fieldName][validator.validator]['arguments'], function (argument, i) {
                                    if (typeof argument == 'string' &&
                                        argument.charAt() == '$') {

                                        var validatorVal = scope.validators[fieldName][validator.validator]['arguments'][i];
                                        var value = validatorVal.slice(1, validatorVal.length);

                                        switch (field.type) {
                                            case 'Date':
                                                scope.validators[fieldName][validator.validator]['arguments'][i] = new Date(scope.ngModel[value]);
                                                scope.$watch('ngModel.' + value, function (newVal) {
                                                    if (newVal) {
                                                        scope.validators[fieldName][validator.validator]['arguments'][i] = new Date(newVal);
                                                    }
                                                });
                                                break;
                                        }

                                    }
                                });

                                errorsMessagesHandler(validator, fieldName, field.type);
                            });

                        }
                    };

                    /**
                     * Wrapper for error replacer
                     *
                     * @param  {Object} validator field.validate field
                     * @param  {String} fieldName
                     * @param  {String} fieldType
                     */
                    function errorsMessagesHandler (validator, fieldName, fieldType) {

                        var errorMessages = validator.errorMessages;

                        _.each(errorMessages, function (message, messageType) {
                            var atRegex = /\@([a-zA-Z]+)/;
                            var valRegex = /\$val/;
                            var dollarRegex = /\$([a-zA-Z]+)/;
                            var hashRegex = /\#([a-zA-Z]+)/;

                            // $length - bind value once
                            if (message.match(dollarRegex)) {
                                var valueName = message.match(dollarRegex)[1];
                                if (valueName !== 'val') {
                                    message = replaceErrorTemplatePlaceholders(message, /\$[a-zA-Z]+/, validator.arguments[valueName], fieldType);
                                }
                            }

                            // $val or @limit this values need watchers

                            if (message.match(valRegex) || message.match(atRegex)) {
                                var watchCollection = [];
                                var replacePatterns = [];

                                if (message.match(valRegex)) {
                                    watchCollection.push('ngModel.' + fieldName);
                                    replacePatterns.push(valRegex);
                                }

                                if (message.match(atRegex)) {
                                    // get linked argument value
                                    var argumentName = message.match(atRegex)[1];
                                    var argumentValue = validator.arguments[argumentName];
                                    var value = argumentValue;

                                    if (argumentValue.charAt() == '$') {
                                        argumentValue = _.tail(argumentValue).join('');
                                        value = scope.schema[argumentValue]['fullName'];
                                    }

                                    message = replaceErrorTemplatePlaceholders(message, atRegex, value, fieldType);
                                }

                                if (message.match(hashRegex)) {
                                    var argumentName = message.match(hashRegex)[1];
                                    var argumentValue = validator.arguments[argumentName];


                                    if (argumentValue.charAt() == '$') {
                                        watchCollection.push('ngModel.' + argumentValue.match(dollarRegex)[1]);
                                        replacePatterns.push(hashRegex);
                                    } else {
                                        message = replaceErrorTemplatePlaceholders(message, hashRegex, argumentValue, fieldType);
                                    }
                                }

                                var messageSource = message;


                                var formWatchCollection = _.map(watchCollection, function (val) {
                                  return val.split('.')[1];
                                });

                                scope.$watchGroup(watchCollection, function (newVal) {

                                    var m = messageSource;
                                    _.each(newVal, function (val, index) {
                                        if (!val) {
                                          var fieldID = watchCollection[index].split('.')[1];
                                          if ($('#' + fieldID + ' input').length) {
                                            var id = $('#' + fieldID + ' input').attr('id');
                                            $('#' + id).off('keyup');
                                            $('#' + id).on('keyup', function () {
                                              errorMessages[messageType] = replaceErrorTemplatePlaceholders(m, replacePatterns[index], $(this).val(), fieldType);
                                              updateErrorMessage();
                                            });
                                          }
                                        } else {
                                          m = replaceErrorTemplatePlaceholders(m, replacePatterns[index], val, fieldType);
                                        }
                                    });

                                    errorMessages[messageType] = m;
                                    updateErrorMessage();
                                });
                            }


                            errorMessages[messageType] = unescape(message);
                            updateErrorMessage();
                        });

                        /**
                         * Set scope.validators value
                         */
                        function updateErrorMessage () {
                            return scope.validators[fieldName][validator.validator]['errorMessages'] = errorMessages;
                        }
                    };

                    /**
                     * Retrieve all related to message update funtcions and return result
                     *
                     * @param  {String} message
                     * @param  {Regexp} pattern
                     * @param  {String} value
                     * @param  {String} fieldType
                     *
                     * @return {String} Updated message
                     */
                    function replaceErrorTemplatePlaceholders (message, pattern, value, fieldType) {
                        if (value) {
                            var updatedValue = errorsValuePresenter(value, fieldType);
                            return message.replace(pattern, updatedValue);
                        } else {
                            return message;
                        }
                    };

                    /**
                     * This functions returns filtered value for example (timestamp to date in string format)
                     *
                     * @param  {String} value     value to filter
                     * @param  {String} fieldType value type
                     *
                     * @return {String}           filtered value
                     */
                    function errorsValuePresenter (value, fieldType) {
                        var dateFormat = 'MM/dd/yyyy';
                        switch (fieldType) {
                            case 'Date':
                                return $filter('date')(value, dateFormat);
                                break;

                            default:
                                return value;
                                break;
                        }
                    }

                    function fillArray (from, to) {
                        var arrayLength = (to - from) + 1;
                        var array = Array(arrayLength);

                        for (var i = 0; i < arrayLength; i++) {
                            array[i] = i + from;
                        }

                        return array;
                    };


                });
            }

        };
    }
})();
