;(function () {
  angular
    .module('app.adpForms')
    .constant('FIELDS_WITH_UNIQUE_WRAPPER', [
      'Object',
      'Array',
      'AssociativeArray',
      'Blank',
      'StaticHtml',
      'Readonly',
      'Recaptcha',
      'FormSeparator',
    ])
    .constant('OTHER_FIELDS', {
      'String[]': 'string-array',
      'Number[]': 'number-array',
      'Double[]': 'number-array',
      'Int32[]': 'number-array',
      'Int64[]': 'number-array',
      'Decimal128[]': 'decimal-array',
      'DateTime[]': 'datetime-array',
      'Date[]': 'datetime-array',
      'Code': 'code',
      'Mixed': 'code',

      'ImperialHeight': 'imperial-units',
      'ImperialWeightWithOz': 'imperial-units',

      'LookupObjectID': 'lookup',
      'LookupObjectID[]': 'lookup',
      'TreeSelector': 'tree-selector',
      'Html': 'html',
      'Grid': 'grid',

      'File': 'file',
      'Image': 'file',
      'Audio': 'file',
      'Video': 'file',
      'File[]': 'file',
      'Image[]': 'file',
      'Audio[]': 'file',
      'Video[]': 'file',

      'Recaptcha': 'recaptcha',

      'Boolean': 'boolean',
      'TriStateBoolean': 'tri-state-boolean',
      'Location': 'location',

      'List': 'list',
      'List[]': 'list',

      'CronExpression': 'cron-expression',

      Password: 'password',
    })
    .constant('DX_CONTROLS', {
      String: ['String', 'Phone', 'Url', 'Email', 'PasswordAuth', 'ObjectID'],
      Number: ['Number', 'Double'],
      Decimal: ['Decimal128'],
      Int: ['Int32', 'Int64'],
      Date: ['Date', 'DateTime', 'Time'],
      Text: ['Text'],
      Currency: ['Currency'],
      ImperialWeight: ['ImperialWeight'],
    })

})();
