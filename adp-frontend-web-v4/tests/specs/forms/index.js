var utils = require('../../utils');
var _ = require('lodash');

module.exports = function (schema, formSelector, done) {
  describe('form test', function () {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 15000;

    var typeMap = {
      'String': 'string',
      'String:Url': 'string',
      'String:Email': 'email',
      'String:Password': 'string',
      'String[]': 'multiselect',
      'Select': 'select',
      'Date': 'date',
      'Number': 'number',
      'Number:ImperialHeight': 'imperial-height',
      'Number:ImperialWeight': 'imperial-weight',
      'Search': 'lookup',
      'Boolean': 'boolean',
      'ObjectID': 'parent-select'
    }

    _.forIn(schema.fields, function(field, fieldName) {
      var fieldType = utils.getFieldType(field);

      if ( typeMap[fieldType] ) {
        require('./' + typeMap[fieldType])(field, fieldName);
      }
    });

    done();
  });
}
