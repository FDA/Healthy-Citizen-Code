;(function () {
  angular
    .module('app.adpForms')
    .constant('BS_DATE_FORMAT', 'MM/DD/YYYY')
    .constant('DATE_FORMAT', 'M/D/YYYY')
    .constant('TIME_FORMAT', 'h:mm a')
    .constant('DATE_TIME_FORMAT', 'M/D/YYYY h:mm a')
    .constant('IMPERIAL_UNITS', {
      'HEIGHT': [
        {
          name: 'foots',
          label: '\'',
          range: [1, 9]
        },
        {
          name: 'inches',
          label: '\'\'',
          range: [1, 12]
        }
      ],
      'WEIGHT_OZ': [
        {
          name: 'pounds',
          label: 'lb',
          range: [1, 11]
        },
        {
          name: 'ounce',
          label: 'oz',
          range: [1, 16]
        }
      ],
      'WEIGHT': [
        {
          name: 'pounds',
          label: 'lb',
          range: [1, 11]
        }
      ]
    });
})();
