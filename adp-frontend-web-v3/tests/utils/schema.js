var _ = require('lodash');
var appModel = require('../../.tmp/app-model.json');
var schemas = appModel.models;

module.exports = {
  getStateName: function (schemaPath) {
    var stateName = _.last(schemaPath.split('.'));

    return 'app.' + stateName;
  },

  getPageType: function (schemaPath) {
    var pageType;
    var schema = _.get(schemas, schemaPath);

    if (!schema) return false;
    // Details page
    if (schema.serverSide) {
      return 'serverSide';
    }

    if (schema.singleRecord) {
      pageType = 'singleRecord';
    } else {
      pageType = this.isNestedState(schemaPath) ? 'multiRecordNested' : 'multiRecord';
    }

    return pageType;
  },

  getFieldType: function (field) {
    if (!field) return;

    var type = field.type;
    var subtype = ('subtype' in field) ? field.subtype : null;
    var fieldType = subtype ? [type, subtype].join(':') : type;

    // exceptions
    if ('lookup' in field) {
      fieldType = 'Search';
    }

    // exceptions
    if ('list' in field) {
      fieldType = fieldType === 'String[]' ? 'String[]' : 'Select';
    }

    return fieldType;
  },

  isNestedState: function (schemaPath) {
    return schemaPath.split('.').length > 3;
  },

  getSchemaPath: function (link) {
    var link = _.startsWith(link, '/') ? link.substr(1) : link;

    return link.split('/').join('.fields.');
  },

  getPageLink: function (link) {
    return link.replace(/\:\w+\//, '');
  },

  getStateName: function (schemaPath) {
    return 'app.' + _.last(schemaPath.split('.'));
  }

}
