import math from 'mathjs';
import {generateDateString} from './date';

export const parseInterface = (items, isChild) => {
  let result = [];

  if (!isChild) {
    result.push({
      name: 'Dashboard',
      route: 'Dashboard',
      params: {}
    });
  }

  if (!items) {
    return result;
  }

  for (let id in items) {
    if (items.hasOwnProperty(id)) {
      const data = items[id];

      if (
        id === 'products' ||
        id === 'administrator'
      ) {
        continue;
      }

      let interfaceData = {
        name: data.fullName,
        description: data.description,
        route: 'List',
        params: {}
      };

      if (
        data.link && (
          data.link.indexOf('/phis') === 0 ||
          data.link.indexOf('/piis') === 0
        )
      ) {
        interfaceData.params.currentPath = data.link;
      }

      if (typeof data.fields === 'object') {
        interfaceData.submenu = parseInterface(data.fields, true);
      }

      result.push(interfaceData);
    }
  }

  return result;
};

export const parseDashboard = (fields, data) => {
  let result = [];

  if (!fields) {
    return result;
  }

  for (let id in fields) {
    if (fields.hasOwnProperty(id)) {
      const item = fields[id];

      result.push({
        id: id,
        fullName: item.fullName,
        shortName: item.shortName || null,
        description: item.description,
        template: item.template,
        icon: item.icon,
        color: item.color,
        path: item.link,
        data: data[id] || {}
      });
    }
  }

  return result;
};

export const getInterfaceByPath = (interfaces, path) => {
  for (let i = 0; i < interfaces.length; i++) {
    if (interfaces[i].params.currentPath === path) {
      return interfaces[i];
    }

    if (interfaces[i].submenu) {
      const subInterface = getInterfaceByPath(interfaces[i].submenu, path);

      if (subInterface) {
        return subInterface;
      }
    }
  }

  return null;
};

export const parseFieldTypes = (types) => {
  let result = {};

  for (let typeId in types) {
    if (types.hasOwnProperty(typeId)) {
      const type = types[typeId];

      result[typeId] = {};

      for (let itemId in type) {
        if (type.hasOwnProperty(itemId)) {
          const value = type[itemId];

          switch (typeof(value)) {
            case 'object':
              result[typeId][itemId] = value.name;

              break;
            default:
              result[typeId][itemId] = value;

              break;
          }
        }
      }
    }
  }

  return result;
};

const getEnumByList = (list) => {
  const result = {};

  for (let fieldName in list) {
    if (list.hasOwnProperty(fieldName)) {
      let value = list[fieldName];

      if (typeof value === 'object') {
        value = value.name;
      }

      result[fieldName] = value;
    }
  }

  return result;
};

const getFuncByFuncName = funcName => {
  switch (funcName) {
    case 'min':
      return (value, minValue) => value >= minValue;
    case 'max':
      return (value, maxValue) => value <= maxValue;
    case 'minLength':
      return (value, minLength) => value.length >= minLength;
    case 'maxLength':
      return (value, maxLength) => value.length <= maxLength;
    case 'regex':
      return (value, regex) => value.match(regex);
    default:
      return () => true;
  }
};

const checkValidation = (value, validate) => {
  if (value === null || !value.toString().length) {
    return true;
  }

  const parsedValidate = math.parse(validate.replace(/['"]/g, quote => (quote === '"' ? "'" : '"')));
  const func = getFuncByFuncName(parsedValidate.name);
  const args = [value].concat(parsedValidate.args.map(item => (
    item.valueType === 'number'
      ? parseInt(item.value)
      : item.value
  )));

  return func.apply(null, args);
};

const getValidate = validate => {
  if (!validate || !Array.isArray(validate) || !validate.length) {
    return null;
  }

  return value => validate.every(validateItem => checkValidation(value, validateItem));
};

const createSchemaResultPathIfNotExists = (result, path, sourceData) => {
  if (typeof result[path] === 'undefined') {
    result[path] = {
      requiresAuthentication: !!sourceData.requiresAuthentication,
      singleRecord: !!sourceData.singleRecord,
      labelRenderer: sourceData.labelRenderer || null,
      fields: {},
      order: [],
      sort: null
    };

    if (
      !sourceData.serverSide &&
      typeof sourceData.defaultSortBy === 'object' &&
      sourceData.defaultSortBy &&
      Object.keys(sourceData.defaultSortBy).length
    ) {
      result[path].sort = Object.keys(sourceData.defaultSortBy).map(sortFieldId => ({
        fieldId: sortFieldId,
        direction: sourceData.defaultSortBy[sortFieldId]
      }))[0];
    }

    if (typeof sourceData.limitReturnedRecords === 'number') {
      result[path].limit = sourceData.limitReturnedRecords;
    }
  }
};

export const parseSchemas = (fields, fieldTypes, path = '', sourceData) => {
  let result = {};

  if (!fields) {
    return result;
  }

  for (let id in fields) {
    if (fields.hasOwnProperty(id)) {
      const data = fields[id];

      switch (data.type) {
        case 'Schema':
        case 'Subschema':
          if (typeof data.fields === 'undefined') {
            continue;
          }

          result = {
            ...result,
            ...parseSchemas(data.fields, fieldTypes, `${path}/${id}`, data)
          };

          break;
        case 'Object':
          if (typeof data.fields === 'undefined') {
            continue;
          }

          const subObject = parseSchemas(data.fields, fieldTypes, path, data)[path];

          createSchemaResultPathIfNotExists(result, path, sourceData);

          result[path] = {
            ...result[path],
            order: typeof data.visible === 'boolean' && !data.visible
              ? result[path].order
              : result[path].order.concat([id]),
            fields: {
              ...result[path].fields,
              [id]: {
                type: 'Object',
                fields: subObject.fields,
                order: subObject.order
              }
            }
          };

          break;
        case 'ObjectID':
        case 'ObjectID[]':
          if (typeof data.lookup === 'object') {
            createSchemaResultPathIfNotExists(result, path, sourceData);

            result[path] = {
              ...result[path],
              order: typeof data.visible === 'boolean' && !data.visible
                ? result[path].order
                : result[path].order.concat([id]),
              fields: {
                ...result[path].fields,
                [id]: {
                  type: 'Lookup',
                  required: !!data.required,
                  name: data.fullName || (id.charAt(0).toUpperCase() + id.slice(1).toLowerCase()),
                  description: data.description || null,
                  width: data.width > 0 ? data.width * 1.0 : 100,
                  lookupId: data.lookup.id,
                  searchable: !!data.searchable,
                  visibilityPriority: data.visibilityPriority || null
                }
              }
            };
          }

          break;
        default:
          const fieldSchemaObject = {
            type: data.type,
            required: !!data.required,
            // validate: getValidate(data.validate),
            name: data.fullName || (id.charAt(0).toUpperCase() + id.slice(1).toLowerCase()),
            description: data.description || null,
            width: data.width > 0 ? data.width * 1.0 : 100,
            searchable: !!data.searchable,
            visibilityPriority: data.visibilityPriority || null
          };

          if (
            data.type === 'String' &&
            typeof data.list === 'string'
          ) {
            fieldSchemaObject.type = 'Enum';
            fieldSchemaObject.enums = getEnumByList(fieldTypes[data.list]);
          }
          if (
            data.type === 'String[]'
          ) {
            fieldSchemaObject.type = 'MultiSelect';
            fieldSchemaObject.enums = getEnumByList(fieldTypes[data.list]);
          }

          if (typeof data.lookup === 'object') {
            fieldSchemaObject.type = 'Lookup';
            fieldSchemaObject.lookupId = data.lookup.id;
          }

          if (
            data.type === 'String' &&
            typeof data.subtype === 'string'
          ) {
            fieldSchemaObject.fieldType = data.subtype;
          }

          if (
            data.type === 'Number' &&
            data.subtype === 'ImperialHeight'
          ) {
            fieldSchemaObject.type = 'Height';
          }

          createSchemaResultPathIfNotExists(result, path, sourceData);

          result[path] = {
            ...result[path],
            order: typeof data.visible === 'boolean' && !data.visible
              ? result[path].order
              : result[path].order.concat([id]),
            fields: {
              ...result[path].fields,
              [id]: fieldSchemaObject
            }
          };

          break;
      }
    }
  }

  if (result[path] && result[path].order) {
    result[path].order = result[path].order.sort((fieldA, fieldB) => {
      const priorityFieldA = result[path].fields[fieldA].visibilityPriority;
      const priorityFieldB = result[path].fields[fieldB].visibilityPriority;

      if (priorityFieldA && priorityFieldB) {
        if (priorityFieldA > priorityFieldB) {
          return 1;
        }
        if (priorityFieldA < priorityFieldB) {
          return -1;
        }
        return 0;
      } else {
        if (!priorityFieldA && priorityFieldB) {
          return 1;
        }
        if (priorityFieldA && !priorityFieldB) {
          return -1;
        }
        return 0;
      }
    });
  }

  return result;
};

const getFieldValueByType = (fieldType, fields, fieldId) => {
  const value = fields[fieldId];

  if (
    typeof value !== 'string' &&
    typeof value !== 'number' &&
    typeof value !== 'boolean' &&
    fieldType !== 'MultiSelect' &&
    fieldType !== 'Height'
  ) {
    return null;
  }

  switch (fieldType) {
    case 'Date':
      return generateDateString(new Date(value));
    case 'Number':
    case 'Weight':
      return parseInt(value);
    case 'Lookup':
      return {
        id: value,
        label: fields[`${fieldId}_label`]
      };
    default:
      return value;
  }
};

export const parseDataFields = (fieldsSchema, fields) => {
  let result = {};

  for (let fieldId in fields) {
    if (fields.hasOwnProperty(fieldId) && typeof fieldsSchema[fieldId] !== 'undefined') {
      result[fieldId] = getFieldValueByType(fieldsSchema[fieldId].type, fields, fieldId);
    }
  }

  return result;
};

export const createDataResultPathIfNotExists = (result, path, fullPath) => {
  if (typeof result[path] === 'undefined') {
    result[path] = {
      items: {},
      fullPath
    };
  }
};

// TODO: please refactor this method to keep raw data without paths. Keeping paths wastes a lot of memory and not sustainable
export const parseData = (fieldsSchema, records, path = '/phis', fullPath = '/phis') => {
  let result = {};

  if (!records || !records.length) {
    return result;
  }

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const recordId = record._id;

    if (typeof recordId === 'undefined') {
      continue;
    }

    for (let fieldId in record) {
      if (record.hasOwnProperty(fieldId)) {
        const fieldData = record[fieldId];

        if (
          typeof fieldsSchema[path] !== 'undefined' &&
          typeof fieldsSchema[path].fields !== 'undefined' &&
          typeof fieldsSchema[path].fields[fieldId] !== 'undefined' &&
          (
            typeof fieldData === 'string' ||
            typeof fieldData === 'number' ||
            (
              Array.isArray(fieldData) &&
              fieldsSchema[path].fields[fieldId].type === 'MultiSelect'
            ) ||
            (
              Array.isArray(fieldData) &&
              fieldsSchema[path].fields[fieldId].type === 'Height'
            ) ||
            (
              typeof fieldData === 'object' &&
              fieldData === null
            )
          )
        ) {
          createDataResultPathIfNotExists(result, path, fullPath);

          if (typeof result[path].items[recordId] === 'undefined') {
            result[path].items[recordId] = {};
          }

          result[path].items[recordId] = {
            ...result[path].items[recordId],
            [fieldId]: getFieldValueByType(fieldsSchema[path].fields[fieldId].type, record, fieldId)
          }
        } else if (
          typeof fieldsSchema[path] !== 'undefined' &&
          fieldId === '_id'
        ) {
          createDataResultPathIfNotExists(result, path, fullPath);

          if (typeof result[path].items[recordId] === 'undefined') {
            result[path].items[recordId] = {};
          }

          result[path].items[recordId] = {
            ...result[path].items[recordId],
            id: fieldId
          }
        } else if (Array.isArray(fieldData)) {
          result = {
            ...result,
            ...parseData(fieldsSchema, fieldData, `${path}/${fieldId}`, `${fullPath}/${recordId}/${fieldId}`)
          };
        } else if (
          typeof fieldData === 'object' &&
          fieldData !== null &&
          typeof fieldsSchema[path] !== 'undefined' &&
          typeof fieldsSchema[path].fields !== 'undefined' &&
          typeof fieldsSchema[path].fields[fieldId] !== 'undefined' &&
          typeof fieldsSchema[path].fields[fieldId].fields !== 'undefined'
        ) {
          createDataResultPathIfNotExists(result, path, fullPath);

          result[path].items[recordId] = {
            ...result[path].items[recordId],
            [fieldId]: parseDataFields(fieldsSchema[path].fields[fieldId].fields, fieldData)
          }
        }
      }
    }
  }

  return result;
};
