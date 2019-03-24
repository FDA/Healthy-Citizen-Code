;(function () {
  'use strict';

  angular
    .module('app.adpTables')
    .factory('AdpTableFiltersService', AdpTableFiltersService);

  /** @ngInject */
  function AdpTableFiltersService(
    AdpValidationService,
    AdpTablesService,
    $state
  ) {
    var parsingRules = {
      'string': function (head, parsedData) {
        var name = head.name;

        if (parsedData[name]) {
          head.data = parsedData[name];
        }

        if (parsedData[name + 'Param']) {
          head.searchOption = parsedData[name + 'Param'];
        }
      },
      'number': function (head, parsedData) {
        var name = head.name;
        var min = parsedData[name + 'From'];
        var max = parsedData[name + 'To'];

        head.from = min || null;
        head.to = max || null;
      },
      'date': function (head, parsedData) {
        var name = head.name;
        var min = parsedData[name + 'From'];
        var max = parsedData[name + 'To'];

        head.from = AdpValidationService.isValidDate(min) ? min : null;
        head.to = AdpValidationService.isValidDate(max) ? max : null;
      },
      'lookup': function (head, parsedData) {
        var data = parsedData[head.name] || [];

        var mongoIdRegex = /^[a-f\d]{24}$/i;
        data = data.filter(function (v) {
          return mongoIdRegex.test(v);
        });

        head.data = data.length > 0 ? data : null;
      },
      'default': function (head, parsedData) {
        var name = head.name;

        if (parsedData[name]) {
          head.data = parsedData[name];
        }
      }
    };

    var mapToUrlRules = {
      'string': function (head, targetArray) {
        if (!_.isNil(head.searchOption)) {
          targetArray.push([head.name + 'Param', head.searchOption].join('='));
        }

        if (!_.isNil(head.data)) {
          targetArray.push([head.name, head.data].join('='));
        }
      },
      'list': _setList,
      'number': _setRange,
      'date': _setRange,
      'lookup': _setList,
      'default': function (head, targetArray) {
        if (!_.isNil(head.data)) {
          targetArray.push([head.name, head.data].join('='));
        }
      }
    };

    function _setList(head, targetArray) {
      _.each(head.data, function (v) {
        targetArray.push([head.name, v].join('='));
      });
    }

    function _setRange(head, targetArray) {
      if (!_.isNil(head.from)) {
        targetArray.push([head.name + 'From', head.from].join('='));
      }

      if (!_.isNil(head.to)) {
        targetArray.push([head.name + 'To', head.to].join('='));
      }
    }

    function _parseQueryParams(filterValues, heads) {
      var splittedValues = (decodeURIComponent(filterValues) || '').split('&');
      var result = {};

      _.each(splittedValues, function (keyVal) {
        var keyValPair = keyVal.split('=');
        var key = keyValPair[0];
        var val = keyValPair[1];

        if (_.isUndefined(val)) {
          return;
        }

        var head = _.find(heads, function (head) {
          return head.name === key;
        });

        var arrayExpected = isArray(head);

        if (arrayExpected) {
          result[key] = result[key] || [];
          result[key].push(val);
        } else {
          // take first only
          if (result[key]) return;
          result[key] = val;
        }
      });

      return result;
    }

    function isArray(head) {
      var arrayExpected = false;

      if (head) {
        var directiveType = AdpTablesService.getHeadFilter(head.field).directiveType;
        arrayExpected = ['lookup', 'list'].includes(directiveType);
      }

      return arrayExpected;
    }

    function parseFilterFromUrl(heads, filterValues) {
      var parsed = _parseQueryParams(filterValues, heads);
      _.each(heads, function (head) {
        var directiveType = AdpTablesService.getHeadFilter(head.field).directiveType;
        var setDataFn = parsingRules[directiveType] || parsingRules['default'];

        setDataFn && setDataFn(head, parsed);
      });
    }

    function setFiltersDataToUrl(heads) {
      var valuePairs = [];

      _.each(heads, function (head) {
        var directiveType = AdpTablesService.getHeadFilter(head.field).directiveType;
        var setDataFn = mapToUrlRules[directiveType] || mapToUrlRules['default'];

        setDataFn && setDataFn(head, valuePairs);
      });

      var filtersValueString = encodeURIComponent(valuePairs.join('&'));

      $state.go(
        $state.current.name,
        { filter: filtersValueString },
        { notify: false }
      );
    }

    return {
      parseFilterFromUrl: parseFilterFromUrl,
      setFiltersDataToUrl: setFiltersDataToUrl
    };

  }
})();
