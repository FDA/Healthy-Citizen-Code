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

    function _getStrategy(field, cbName) {
      var filterStrategies = {
        'string': searchString,
        'file': searchMultilineString,
      };

      var mediaTypes = ["Image", "Video", "Audio", "File",
        "Image[]", "Video[]", "Audio[]", "File[]"];

      var isMediaType = mediaTypes.includes(field.type);
      var strategyName = isMediaType ? 'file' : 'string';

      return filterStrategies[strategyName][cbName];
    }

    function getSearchRegex(input, field, cbName) {
      var escapedInput = escapeRegexChars(input);
      var strategyFn = _getStrategy(field, cbName);

      return strategyFn(escapedInput);
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
