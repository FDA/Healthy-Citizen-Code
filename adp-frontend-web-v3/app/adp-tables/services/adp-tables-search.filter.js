;(function () {
  'use strict';

  angular
    .module('app.adpTables')
    .factory('AdpTablesSearchService', AdpTablesSearchService);

  /** @ngInject */
  function AdpTablesSearchService() {
    // search in string, that formatted from html to text
    // currently is used to search in <ul>
    // so text any list item is separated from each one with whitespace
    var searchMultilineString = {
      'any': function () {
        return '\\b.+\\b';
      },
      'contains': function (input) {
        return input ? '\\w*' + input + '\\w*' : '\\b.+\\b';
      },
      'startsWith': function (input) {
        return '\\b' + input;
      },
      'endsWith': function (input) {
        return input + '\\b';
      },
      'equal': function (input) {
        return '\\b' + input + '\\b';
      }
    };

    var searchString = {
      'any': function () {
        return '';
      },
      'contains': function (input) {
        return input;
      },
      'startsWith': function (input) {
        return '^' + input;
      },
      'endsWith': function (input) {
        return input + '$';
      },
      'equal': function (input) {
        return input ? '^' + input + '$' : this.any();
      }
    };

    var filterStrategies = {
      'string': searchString,
      'file': searchMultilineString,
    };

    function getSearchRegex(input, strategyName, cbName) {
      var escapedInput = escapeRegexChars(input);
      return filterStrategies[strategyName][cbName](escapedInput);
    }

    function escapeRegexChars(input) {
      return input.replace(/[\-\[\]{}()*+?.,\\\^$|#]/g, '\\$&')
    }

    function addFilter(fn) {
      $.fn.dataTable.ext.search.push(fn);
    }

    return {
      addFilter: addFilter,
      getSearchRegex: getSearchRegex,
      escapeRegexChars: escapeRegexChars
    }
  }
})();
