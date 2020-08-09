(function ()
{
    'use strict';

    angular
        .module('app.core')
        .filter('valuesPresenter', valuesPresenter);

    /** @ngInject */
    function valuesPresenter($rootScope, $filter)
    {
        return function (value, param, fieldName) {
          var result = "";
          var val = value[fieldName];
          if (!val) {
            return "-";
          }

          // If Enum
          if (param.list) {
            if (!val.length) {
              return "-";
            } else {
              // _.forEach(val, function (val, key) {
              //   result += _.values(val)[0];
              // });


              // if (!result) {
              //   result = '-';
              // }
              // console.log(appModelHelpers.Lists[param.list],param.list,  val);


              if (_.isArray(val)) {

                if (value.subtype == 'ImperialHeight') {
                  console.log(value);
                  return value.join("' ") + ' "';
                } else {
                  result = [];
                  _.each(val, function (item) {
                    var value = appModelHelpers.Lists[param.list][item];
                    if (!value) return '';
                    value = value.name ? value.name : value;
                    result.push(value);
                    // return '';
                  });
                  return result.join(', ');
                }

              } else {
                return appModelHelpers.Lists[param.list][val]['name'] || appModelHelpers.Lists[param.list][val];
              }


            }
          }
          if (param.subtype == 'ImperialHeight') {
            return val.join("' ") + '"';
          }

          // Boolean
          if (param.type == 'Boolean') {
            if (val) {
              return '<i class="icon icon-check"></i>';
            } else {
              return '<i class="icon icon-close"></i>';
            }
          };

          // Date
          if (param.type == 'Date') {
            return $filter('date')(val);
          };

          if (param.type == 'Array') {
            var val = _.map(val, 'name');

            return val.join(', ');
          }

          if (param.type.indexOf('ObjectID') > -1) {
            // console.log('lookup', param.lookup.id);
            // console.log(val, param.lookup.id + '_label', param);
            // console.log();
            return value[fieldName + '_label'];
          }

          if(param.subtype == 'Height') {
            return val.join("'") + '"';
          }

          return val;



          // var result = "";
          // if (!value) {
          //   return "-";
          // }

          // if (param.list) {
          //   if (!val.length) {
          //     return "-";
          //   }

          //   _.forEach(value, function (val, key) {
          //     if (!val) {
          //       return "-";
          //     } else {

          //       return _.values(val)[0];
          //       // result += _.values(val) + ' ,';
          //     }
          //   });

          //   // return result.slice(0, -1);;
          // } else {
          //   if (typeof value == 'boolean') {
          //     if (value) {
          //       result = '<i class="icon icon-check"></i>'
          //     } else {
          //       result = '<i class="icon icon-close"></i>'
          //     }
          //   }
          //   if (typeof value == 'string' && val.length > 5 && !!Date.parse(value)) {
          //     return $filter('date')(value);
          //   }
          // }
          // return result;
        };
    }

})();
