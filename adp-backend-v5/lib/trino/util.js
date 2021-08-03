const _ = require('lodash');

const trinoCollectionName = '_trinoSchema';

function getTrinoTableName(collectionName) {
  return collectionName;
}

function getTrinoSchema(adpSchema) {
  const { collectionName, fields } = adpSchema;
  const trinoSchema = { table: getTrinoTableName(collectionName), fields: [] };
  _.each(fields, (field, fieldName) => {
    const trinoType = getTrinoFieldType(field);
    if (trinoType) {
      trinoSchema.fields.push({
        name: fieldName,
        type: trinoType,
        hidden: false,
      });
    }
  });

  return trinoSchema;
}

function getTrinoFieldType(field) {
  const { type } = field;

  if (type === 'Object') {
    const objTypes = [];
    _.each(field.fields, (objField, fieldName) => {
      const objFieldType = getTrinoFieldType(objField);
      objFieldType && objTypes.push(`"${fieldName}" ${objFieldType}`);
    });
    return _.isEmpty(objTypes) ? 'json' : `row(${objTypes.join(', ')})`;
  }

  if (type === 'AssociativeArray') {
    const objectField = _.clone(field);
    objectField.type = 'Object';
    const objectType = getTrinoFieldType(objectField);
    return `map(varchar, ${objectType})`;
  }

  const stringTypes = [
    'String',
    'Code',
    'Email',
    'Phone',
    'Url',
    'Text',
    'Barcode',
    'Decimal128',
    'Html',
    'CronExpression',
    'Password',
  ];
  if (stringTypes.includes(type)) {
    return 'varchar';
  }

  const doubleTypes = [
    'Number',
    'Double',
    'Currency',
    'BloodPressure',
    'ImperialHeight',
    'ImperialWeight',
    'ImperialWeightWithOz',
  ];
  if (doubleTypes.includes(type)) {
    return 'double';
  }
  if (type === 'Int32') {
    return 'integer';
  }
  if (type === 'Int64') {
    return 'bigint';
  }
  if (type === 'Decimal128') {
    return 'decimal(18, 10)';
  }

  if (type === 'Boolean') {
    return 'boolean';
  }
  if (type === 'DateTime' || type === 'Date' || type === 'Time') {
    return 'timestamp';
  }

  if (type === 'Mixed' || type === 'Mixed[]') {
    return 'json';
  }
  if (type === 'ObjectID') {
    return 'ObjectId';
  }

  if (type === 'LookupObjectID') {
    return `row("_id" ObjectId, "table" varchar, "label" varchar)`;
  }
  if (type === 'TreeSelector') {
    return `array(row("_id" ObjectId, "table" varchar, "label" varchar))`;
  }

  if (type === 'Location') {
    return `row("coordinates" array(double), "label" varchar, "type" varchar)`;
  }

  const fileTypes = ['Image', 'Video', 'Audio', 'File', 'Image[]', 'Video[]', 'Audio[]', 'File[]'];
  if (fileTypes.includes(type)) {
    return `array(row("name" varchar, "size" bigint, "type" varchar, "id" varchar, "cropped" boolean))`;
  }

  if (type.endsWith('[]')) {
    const singleField = _.clone(field);
    singleField.type = type.slice(0, -2);
    const singleType = getTrinoFieldType(singleField);
    return `array(${singleType})`;
  }

  if (type === 'Array' || type === 'Object[]') {
    const objectField = _.clone(field);
    objectField.type = 'Object';
    const objectType = getTrinoFieldType(objectField);
    return `array(${objectType})`;
  }
}

module.exports = {
  trinoCollectionName,
  getTrinoTableName,
  getTrinoSchema,
};
