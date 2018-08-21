;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('AdpFieldFormatUtil', AdpFieldFormatUtil);

  function AdpFieldFormatUtil() {
    // public
    function formatSelectLabel(state) {
      // if option group
      if (!state.id) return state.text;

      var parsedState = JSON.parse(state.text);

      return _.isObject(parsedState.label) ? getFormattedLabel(parsedState.label) : parsedState.label;
    }

    // public
    function formatSelectSelection(state) {
      var parsedState = JSON.parse(state.text);
      return _.isObject(parsedState.label) ? parsedState.label.name : parsedState.label;
    }

    function getFormattedLabel(label) {
      return [
        _labelNameTpl(label),
        _definitionTpl(label)
      ].join('');
    }

    function _labelNameTpl(label) {
      return ['<span>', label.name, '</span>'].join('')
    }

    function _definitionTpl(label) {
      return label.definition ? [
        '<br>',
        '<small>' + label.definition + '</small>'
      ].join('') : '';
    }

    return {
      formatSelectLabel: formatSelectLabel,
      formatSelectSelection: formatSelectSelection
    };
  }
})();