(function ()
{
    'use strict';

    angular
        .module('app.core')
        .provider('hcSchemaService', hcSchemaService);

    /** @ngInject */
    function hcSchemaService()
    {
        // SERVICE
        var service = this;

        service.iterateSubform     = iterateSubform
        service.getSubForms        = getSubForms
        service.parseSchema        = parseSchema
        service.getSubSchemas      = getSubSchemas
        service.getObjectType      = getObjectType
        service.hasSubforms        = hasSubforms
        service.isSubform          = isSubform
        service.stateToUrl         = stateToUrl
        service.removeEmptyArrays  = removeEmptyArrays
        service.updatePresenter    = updatePresenter
        service.removeEmptyHeight  = removeEmptyHeight

        // PROVIDER
        this.$get = function () {
            var service = {
                iterateSubform    : iterateSubform,
                getSubForms       : getSubForms,
                parseSchema       : parseSchema,
                getSubSchemas     : getSubSchemas,
                getObjectType     : getObjectType,
                hasSubforms       : hasSubforms,
                isSubform         : isSubform,
                stateToUrl        : stateToUrl,
                removeEmptyArrays : removeEmptyArrays,
                updatePresenter   : updatePresenter,
                removeEmptyHeight : removeEmptyHeight
            }

            return service
        }

        //////////////////////////////////////////////
        // Methods

        /**
         * iterateSubform
         *
         * @param  {Object} subform Subform object
         * @param  {Object} target
         * @return {Object}
         */
        function iterateSubform (subform, target) {
            target = {}
            _.forEach(subform, function (value, key) {
                target[key] = ""
            });

            return target
        };

        /**
         * getSubForms return sub forms
         *
         * @param  {Object} schema
         * @return {Object}
         */
        function getSubForms (schema) {
            var subforms = {};

            function iterator (obj) {

            };

            _.forEach(schema, function (value, key) {
                var type = getObjectType(value);
                if (type == 'Array') {
                    if (_.isArray(value[0])) {
                        // subforms[key]
                        subform[key] = [value[0]];
                        getSubForms(subform[key]);

                    } else {
                        subforms[key] = value[0];
                    }
                }
            });

            return subforms;
        };


        function parseSchema (schema) {
            var parsedSchema = {}
            parsedSchema.heads = []
            parsedSchema.forms = []

            _.forEach(schema.fields, function (value, key) {
                if (value.type !== 'Schema' && value.type !== 'Subschema') {
                    if (value.visible !== false) {
                        parsedSchema.heads.push({name: key, order:value.visibilityPriority});
                    }
                } else {
                    parsedSchema.forms.push(key)
                }
            });

            parsedSchema.heads = sortHeads(parsedSchema.heads);
            return parsedSchema
        };

        /**
         * getSubSchemas
         *
         * @param  {type} schema description
         * @return {type}        description
         */
        function getSubSchemas (schema) {
            var subSchemas = [];
            _.forEach(schema.fields, function (value, key) {
                if (value.type == 'Subschema') {
                    subSchemas.push(value);
                }
            });

            return subSchemas;
        };

        ///////////////////////
        // Private functions //
        ///////////////////////


        /**
         * sortHeads - sort heads basing on visibilityPriority
         *
         * @param  {Array} heads collection of head
         * @return {Array} sorted heads
         */
        function sortHeads (heads) {
            var sorted = _.sortBy(heads, 'order')
            sorted = _.flatMap(sorted, function (val) {
                return val.name
            })
            return sorted
        }

        /**
         * getObjectType - Returns 'Object' of 'Array'
         *
         * @param  {Object|Array} obj
         * @return {String} type of obj, can be Array or Object
         */
        function getObjectType (obj) {
            if(_.isArray(obj)) return 'Array';
            var type = typeof obj;
            if (type === 'function' || type === 'object' && !!obj) return 'Object';
        };

        /**
         * getObjectSize - Return length of Internal fields
         *
         * @param  {Onject} obj
         * @return {type}
         */
        function getObjectSize (obj) {
            return _.size(obj);
        };

        /**
         * hasSubforms - Finds subforms
         *
         * @param  {Object} schema
         * @return {Boolean}
         */
        function hasSubforms (schema) {
            return !!(_.find(schema.fields, {type: "Subschema"}));
        };

        /**
         * isSubform - Chech is current schema object Subform
         *
         * @param  {type} schema
         * @return {Boolean}
         */
        function isSubform (schema) {
            if (schema.type == "Subschema" || schema.type == "Schema") {
                return true;
            }
            return false;
        };

        /**
         * stateToUrl - state to URL filter
         *
         * @param  {type} state description
         * @return {type}       description
         */
         function stateToUrl (state, parent, name) {
             var path = state.split('.');
             path.shift();

             if (parent) {
                 var parent = parent.split('.');
                 var id = ids[parent[0]];

                 path.splice(1, 0, id);
             }
             if (window.ids[name]) path.push(window.ids[name]);

             return path.join('/');
         }
        /**
         * removeEmptyArrays -
         *
         * @param  {Object} val
         * @return {Object}     object with removed empty arrays
         */
        function removeEmptyArrays (val) {
            var tempVal = val;
            _.forEach(val, function (value, key) {
                if (_.isArray(value) && !value.length) {
                    _.unset(tempVal, key);
                }
            });

            return tempVal;
        };

        /**
         * updatePresenter
         */
        function updatePresenter (val) {
            var result = {};
            var data = _.isArray(val) ? val[0] : val;

            return data;
        };

        function removeEmptyHeight (val) {
            if (val.data.height) {
                if (val.data.height[0] == 0 && val.data.height[1] == 0) {
                    return _.unset(val.data, 'height')
                }
            }
            return val
        };

    };
})();
