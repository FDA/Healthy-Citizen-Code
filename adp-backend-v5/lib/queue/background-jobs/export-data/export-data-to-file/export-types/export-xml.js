const fs = require('fs-extra');
const _ = require('lodash');
const { dateTimeCsvValue, dateCsvValue, timeCsvValue, lookupObjectIdCsvValue } = require('../util');
const { getFieldsToExport } = require('../util');

function indent(num) {
  return _.repeat(' ', num);
}

function wrapValueInTag(tag, value) {
  return value ? `<${tag}>${value}</${tag}>` : '';
}

function defaultXmlValue({ value, scheme }) {
  return wrapValueInTag(scheme.fieldName, value);
}

function dateTimeXmlValue({ value, scheme, options }) {
  return wrapValueInTag(scheme.fieldName, dateTimeCsvValue({ value, scheme, options }));
}

function dateXmlValue({ value, scheme, options }) {
  return wrapValueInTag(scheme.fieldName, dateCsvValue({ value, scheme, options }));
}

function timeXmlValue({ value, scheme, options }) {
  return wrapValueInTag(scheme.fieldName, timeCsvValue({ value, scheme, options }));
}

function lookupObjectIdXmlValue({ value, scheme, options }) {
  return wrapValueInTag(scheme.fieldName, lookupObjectIdCsvValue({ value, scheme, options }));
}

function objectXmlValue({ value, scheme, nestingLevel = 1, options }) {
  if (_.isEmpty(value)) {
    return '';
  }

  const objFields = [];
  _.each(value, (fieldValue, fieldKey) => {
    const nestedFieldScheme = _.get(scheme, ['fields', fieldKey]);
    const { type } = nestedFieldScheme;
    const xmlValueFunc = getXmlValueFunc(type);
    const xmlValue = xmlValueFunc({
      value: fieldValue,
      scheme: nestedFieldScheme,
      nestingLevel: nestingLevel + 1,
      options,
    });
    objFields.push(xmlValue);
  });

  const fieldsString = objFields.map((str) => `${indent(nestingLevel * 2)}${str}`).join('\n');
  return `<${scheme.fieldName}>\n${fieldsString}\n</${scheme.fieldName}>`;
}

function getXmlValueFunc(type) {
  if (type === 'Object') {
    return objectXmlValue;
  }
  if (type === 'LookupObjectID') {
    return lookupObjectIdXmlValue;
  }
  if (type === 'DateTime') {
    return dateTimeXmlValue;
  }
  if (type === 'Date') {
    return dateXmlValue;
  }
  if (type === 'Time') {
    return timeXmlValue;
  }
  return defaultXmlValue;
}

function indentArray(arr, num = 2) {
  return arr.filter((str) => str).map((str) => `${indent(num)}${str}`);
}

module.exports = ({ filePath, scheme, projections, options }) => {
  const xmlFieldsMeta = [];

  return {
    async init() {
      const fieldNames = getFieldsToExport(scheme, projections);
      _.each(fieldNames, (fieldName) => {
        const fieldScheme = scheme.fields[fieldName];
        xmlFieldsMeta.push({ fieldName, fieldScheme, getValue: getXmlValueFunc(fieldScheme.type) });
      });

      await fs.ensureFile(filePath);
      await fs.writeFile(filePath, '<?xml version="1.0" encoding="utf-8"?>\n  <items>\n');
    },
    async add(items) {
      const xmlItems = [];
      _.each(items, async (item) => {
        const itemStrings = [];
        _.each(xmlFieldsMeta, async (xmlFieldMeta) => {
          const { fieldName, fieldScheme, getValue } = xmlFieldMeta;
          const value = item[fieldName];
          itemStrings.push(getValue({ value, scheme: fieldScheme, options }));
        });
        const preparedItemStrings = indentArray(['<item>', ...indentArray(itemStrings), '</item>'], 4).join('\n');
        xmlItems.push(preparedItemStrings);
      });

      await fs.appendFile(filePath, xmlItems.join('\n'));
    },
    async finish() {
      await fs.appendFile(filePath, '\n  </items>');
    },
    mimeType: 'text/xml',
    ext: 'xml',
  };
};
