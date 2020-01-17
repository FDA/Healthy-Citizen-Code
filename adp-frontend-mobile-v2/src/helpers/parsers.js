import _ from 'lodash';
import {getDateGeneratorByDateSubtype} from './date';
import {replaceParams} from './funcs';

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

      // if (
      //   id === 'products' ||
      //   id === 'administrator'
      // ) {
      //   continue;
      // }

      let interfaceData = {
        name: data.fullName,
        description: data.description,
        route: 'List',
        params: {}
      };

      if (data.link) {
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
        parameters: item.parameters,
        subtype: item.subtype,
        icon: item.icon,
        color: item.color,
        path: item.link || _.get(item, 'parameters.link'),
        dashboardListData: item,
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

export const getInterfaceByPathWithoutParams = (interfaces, path) => {
  for (let i = 0; i < interfaces.length; i++) {
    if (interfaces[i].params.currentPath.replace(/:.+?\//, '') === path) {
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
      return (value, args) => value >= args.limit;
    case 'max':
      return (value, args) => value <= args.limit;
    case 'minLength':
      return (value, args) => value.length >= args.length;
    case 'maxLength':
      return (value, args) => value.length <= args.length;
    case 'regex':
      return (value, args) => {
        return value.match(new RegExp(args.regex, args.regexOptions)) !== null;
      };
    default:
      return () => true;
  }
};

const checkValidation = (value, validate) => {
  if (!value || !value.toString().length) {
    return true;
  }
  // TODO: sort out the old code with math
  // const parsedValidate = math.parse(validate.replace(/['"]/g, quote => (quote === '"' ? "'" : '"')));
  const func = getFuncByFuncName(validate.validator);
  // const args = [value].concat(validate.arguments.map(item => (
  //   item.valueType === 'number'
  //     ? parseInt(item.value)
  //     : item.value
  // )));\
  return func.apply(null, [value].concat(validate.arguments));
};

const getErrorMessages = validate => {
  if (!Array.isArray(validate) || !validate.length) {
    return null;
  }

  return validate.map(validateItem => {
    const errorMessage = _.get(validateItem, 'errorMessages.default', null);
    return replaceParams(errorMessage);
  });
};

const getValidations = validate => {
  if (!Array.isArray(validate) || !validate.length) {
    return null;
  }

  return validate.map(validateItem => (value => checkValidation(value, validateItem)));
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
                  isMultiple: data.type === 'ObjectID[]',
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
        case 'Location':
          createSchemaResultPathIfNotExists(result, path, sourceData);

          const location_label = id + '_label';
          result[path] = {
            ...result[path],
            order: typeof data.visible === 'boolean' && !data.visible
              ? result[path].order
              : result[path].order.concat([id, location_label]),
            fields: {
              ...result[path].fields,
              [id]: {
                type: "LocationCoordinates",
                // description: "Location coordinates",
                required: !!data.required,
                validations: getValidations(data.validate),
                errorMessages: getErrorMessages(data.validate),
                name: data.fullName || (id.charAt(0).toUpperCase() + id.slice(1).toLowerCase()),
                description: data.description || null,
                parameters: data.parameters,
                width: data.width > 0 ? data.width * 1.0 : 100,
                searchable: !!data.searchable,
                visibilityPriority: data.visibilityPriority || null,
                synthesize: data.synthesize,
                formRender: data.formRender,
                visible: false,
                hidden: true
              },
              [location_label]: {
                type: "LocationLabel",
                name: data.fullName ? data.fullName + ' label' : (id.charAt(0).toUpperCase() + id.slice(1).toLowerCase() + ' label'),
                description: data.description ? data.description + ' label' : null,
                width: 100,
                visible: true
              }
            }
          };

          break;
        case 'Barcode':
          createSchemaResultPathIfNotExists(result, path, sourceData);

          const barcodeType = id + '_type';
          result[path] = {
            ...result[path],
            order: typeof data.visible === 'boolean' && !data.visible
              ? result[path].order
              : result[path].order.concat([id]),
            fields: {
              ...result[path].fields,
              // [barcode]: {
              //   type: "BarcodeType",
              //   required: !!data.required,
              //   name: data.fullName ? data.fullName + ' type' : (id.charAt(0).toUpperCase() + id.slice(1).toLowerCase() + ' type'),
              //   description: data.description || null,
              //   parameters: data.parameters,
              //   width: data.width > 0 ? data.width * 1.0 : 50,
              //   searchable: !!data.searchable,
              //   visibilityPriority: data.visibilityPriority || null,
              //   synthesize: data.synthesize,
              //   formRender: data.formRender,
              //   visible: false,
              //   hidden: true
              // },
              [id]: {
                type: "Barcode",
                name: data.fullName || (id.charAt(0).toUpperCase() + id.slice(1).toLowerCase()),
                description: data.description || null,
                width: 100,
                visible: true
              }
            }
          };

          break;
        case 'Group':
          const groupSchemaObject = {
            type: data.type,
            subtype: data.subtype,
            required: !!data.required,
            list: data.list,
            validations: getValidations(data.validate),
            errorMessages: getErrorMessages(data.validate),
            name: data.fullName || (id.charAt(0).toUpperCase() + id.slice(1).toLowerCase()),
            description: data.description || null,
            width: data.width > 0 ? data.width * 1.0 : 100,
            searchable: !!data.searchable,
            visibilityPriority: data.visibilityPriority || null
          };

          createSchemaResultPathIfNotExists(result, path, sourceData);

          result[path] = {
            ...result[path],
            order: typeof data.visible === 'boolean' && !data.visible
              ? result[path].order
              : result[path].order.concat([id]),
            fields: {
              ...result[path].fields,
              [id]: groupSchemaObject
            }
          };

          break;
        default:
          const fieldSchemaObject = {
            type: data.type,
            subtype: data.subtype,
            required: !!data.required,
            list: data.list,
            validations: getValidations(data.validate),
            errorMessages: getErrorMessages(data.validate),
            name: data.fullName || (id.charAt(0).toUpperCase() + id.slice(1).toLowerCase()),
            description: data.description || null,
            width: data.width > 0 ? data.width * 1.0 : 100,
            searchable: !!data.searchable,
            visibilityPriority: data.visibilityPriority || null,
            synthesize: data.synthesize,
            formRender: data.formRender,
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

          if (
            data.type === 'Number' &&
            data.subtype === 'ImperialWeight'
          ) {
            fieldSchemaObject.type = 'Weight';
          }

          if (
            data.type === 'Number' &&
            data.subtype === 'ImperialWeightWithOz'
          ) {
            fieldSchemaObject.type = 'WeightWithOz';
          }

          if (
            data.type === 'String' &&
            data.subtype === 'Barcode'
          ) {
            fieldSchemaObject.type = 'Barcode';
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

  // not used currently
  // if (result[path] && result[path].order) {
  //   result[path].order = result[path].order.sort((fieldA, fieldB) => {
  //     const priorityFieldA = result[path].fields[fieldA].visibilityPriority;
  //     const priorityFieldB = result[path].fields[fieldB].visibilityPriority;
  //
  //     if (priorityFieldA && priorityFieldB) {
  //       if (priorityFieldA > priorityFieldB) {
  //         return 1;
  //       }
  //       if (priorityFieldA < priorityFieldB) {
  //         return -1;
  //       }
  //       return 1;
  //     } else {
  //       if (!priorityFieldA && priorityFieldB) {
  //         return 1;
  //       }
  //       if (priorityFieldA && !priorityFieldB) {
  //         return -1;
  //       }
  //       return 1;
  //     }
  //   });
  // }

  return result;
};

const getFieldValueByType = (fieldType, fields, fieldId, wholeSchema) => {
  const value = fields[fieldId];

  if (
    typeof value !== 'string' &&
    typeof value !== 'number' &&
    typeof value !== 'boolean' &&
    fieldType !== 'MultiSelect' &&
    fieldType !== 'Height' &&
    fieldType !== 'Lookup' &&
    !_.isArray(value)
  ) {
    return null;
  }

  switch (fieldType) {
    case 'Date':
      return getDateGeneratorByDateSubtype(wholeSchema.subtype)(value);
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
      result[fieldId] = getFieldValueByType(fieldsSchema[fieldId].type, fields, fieldId, fieldsSchema[fieldId]);
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

const arrayTypes = [
  'MultiSelect',
  'Height',
  'Lookup',
  'Image',
  'Video',
  'Audio',
  'File',
  'Image[]',
  'Video[]',
  'Audio[]',
  'File[]'
];

// TODO: please refactor this method to keep raw data without paths. Keeping paths wastes a lot of memory and not sustainable
export const parseData = (fieldsSchema, records, path = '/phis', fullPath = '/phis') => {
  let result = {};

  if (!records || !records.length) {
    return result;
  }

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const recordId = record._id;

    if (!recordId) {
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
              arrayTypes.includes(fieldsSchema[path].fields[fieldId].type) ||
              fieldsSchema[path].fields[fieldId].type === 'LocationCoordinates'
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
            [fieldId]: getFieldValueByType(fieldsSchema[path].fields[fieldId].type, record, fieldId, fieldsSchema[path].fields[fieldId])
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
