;(function () {
  angular
    .module('app.adpForms')
    // todo: move to schema service closer to type definitions
    .constant('DATE_FORMAT', 'M/D/YYYY')
    .constant('TIME_FORMAT', 'h:mm a')
    .constant('DATE_TIME_FORMAT', 'M/D/YYYY h:mm a')
    .constant('IMPERIAL_UNITS_DEFAULTS', {
      'ImperialHeight': [
        {
          name: 'foots',
          shortName: 'ft',
          label: '\'',
          range: [1, 9]
        },
        {
          name: 'inches',
          shortName: 'in',
          label: '\'\'',
          range: [1, 12]
        }
      ],
      'ImperialWeightWithOz': [
        {
          name: 'pounds',
          shortName: 'lb',
          label: 'lb',
          range: [1, 11]
        },
        {
          name: 'ounce',
          shortName: 'oz',
          label: 'oz',
          range: [1, 16]
        }
      ],
      'ImperialWeight': [
        {
          name: 'pounds',
          shortName: 'lb',
          label: 'lb',
          range: [1, 11]
        }
      ]
    });
})();
