const _ = require('lodash');
const { schemaComposer } = require('graphql-compose');
const { GraphQLScalarType, Kind } = require('graphql');
const { ObjectID } = require('mongodb');

const COMPOSER_TYPES = {
  OUTPUT: 'Output',
  OUTPUT_WITH_ACTIONS: 'OutputWithActions',
  INPUT: 'Input',
  INPUT_WITHOUT_ID: 'InputWithoutId',
};

function isInputType(composerType) {
  if (!Object.values(COMPOSER_TYPES).includes(composerType)) {
    throw new Error(`Invalid composer type ${composerType}`);
  }
  return [COMPOSER_TYPES.INPUT, COMPOSER_TYPES.INPUT_WITHOUT_ID].includes(composerType);
}

const MongoIdScalarTC = schemaComposer.createScalarTC({
  name: 'MongoId',
  description: 'Mongo document "_id" represented as string',
  serialize: value => value,
  parseValue: value => ObjectID(value),
  parseLiteral: ast => ObjectID(ast.value),
});

const MongoIdITC = schemaComposer.createInputTC({
  name: 'MongoIdInput',
  fields: {
    _id: MongoIdScalarTC,
  },
});

const AnythingType = new GraphQLScalarType({
  name: 'Anything',
  description: 'Any value.',
  parseValue: value => value,
  parseLiteral: anythingParseLiteral,
  serialize: value => value,
});

function anythingParseLiteral(ast) {
  switch (ast.kind) {
    case Kind.BOOLEAN:
    case Kind.STRING:
      return ast.value;
    case Kind.INT:
    case Kind.FLOAT:
      return Number(ast.value);
    case Kind.LIST:
      return ast.values.map(anythingParseLiteral);
    case Kind.OBJECT:
      return ast.fields.reduce((accumulator, field) => {
        accumulator[field.name.value] = anythingParseLiteral(field.value);
        return accumulator;
      }, {});
    case Kind.NULL:
      return null;
    default:
      throw new Error(`Unexpected kind in parseLiteral: ${ast.kind}`);
  }
}

const locationOTC = schemaComposer.createObjectTC({
  name: 'Location',
  fields: {
    coordinates: '[Float]',
    label: 'String',
  },
});

const locationITC = schemaComposer.createInputTC({
  name: 'LocationInput',
  fields: {
    coordinates: '[Float]',
    label: 'String',
  },
});

function getLocationType(composerType) {
  return isInputType(composerType) ? locationITC : locationOTC;
}

function getOrCreateEnum(enumName, values) {
  return schemaComposer.has(enumName)
    ? schemaComposer.getETC(enumName)
    : schemaComposer.createEnumTC({
        name: enumName,
        values: _.reduce(
          values,
          (r, value) => {
            r[value] = { value };
            return r;
          },
          {}
        ),
      });
}
module.exports = {
  COMPOSER_TYPES,
  isInputType,
  MongoIdScalarTC,
  MongoIdITC,
  AnythingType,
  getLocationType,
  getOrCreateEnum,
};
