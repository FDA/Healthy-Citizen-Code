;(function () {
  angular
    .module('app.adpForms')
    // todo: move to schema service closer to type definitions
    .constant('DX_ACCOUNTING_FORMAT', '$ #,##0.##;($ #,##0.##)')
    .constant('DATE_FORMAT', 'M/D/YYYY')
    .constant('TIME_FORMAT', 'h:mm a')
    .constant('DATE_TIME_FORMAT', 'M/D/YYYY h:mm a')
    .constant('IMPERIAL_UNITS_DEFAULTS', {
      'ImperialHeight': [
        {
          name: 'foots',
          shortName: 'ft',
          label: '\'',
          range: [0, 9]
        },
        {
          name: 'inches',
          shortName: 'in',
          label: '\'\'',
          range: [0, 12]
        }
      ],
      'ImperialWeightWithOz': [
        {
          name: 'pounds',
          shortName: 'lb',
          label: 'lb',
          range: [0, 11]
        },
        {
          name: 'ounce',
          shortName: 'oz',
          label: 'oz',
          range: [0, 16]
        }
      ],
      'ImperialWeight': [
        {
          name: 'pounds',
          shortName: 'lb',
          label: 'lb',
          range: [0, 11]
        }
      ]
    });
})();
