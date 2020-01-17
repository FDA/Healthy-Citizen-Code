const _ = require('lodash');
const Promise = require('bluebird');
const log = require('log4js').getLogger('server_controllers/webvowl');

module.exports = () => {
  const m = {};

  function getInitialConfig() {
    return {
      header: {
        languages: ['en'],
        baseIris: ['http://www.w3.org/2000/01/rdf-schema'],
        iri: 'http://vip.conceptant.com/vip_ontology/',
      },
      namespace: [],
      class: [],
      classAttribute: [],
      property: [],
      propertyAttribute: [],
    };
  }

  function transformDocToWebVOWL(doc, schema, schemaName, config) {
    addDocClass(doc, schema, schemaName, config);

    _.each(doc, (val, path) => {
      if (val) {
        handleModelPart(doc, path, schema, schemaName, config);
      }
    });
  }

  function addDocClass(doc, schema, schemaName, config) {
    const labelRenderer =
      m.appLib.appModelHelpers.LabelRenderers[schema.labelRenderer] || getDefaultLabelRenderer(schema);

    const classId = getClassIdForDoc(doc._id, schemaName);
    const classType = 'owl:Class';
    const classAttributeLabel = labelRenderer(doc);
    config.class.push({ id: classId, type: classType });
    config.classAttribute.push({ id: classId, label: classAttributeLabel });
  }

  function getDefaultLabelRenderer(schema) {
    const firstStringField = getSchemaFirstStringField(schema);
    const labelField = firstStringField || '_id';
    return doc => _.get(doc, labelField);
  }

  function getSchemaFirstStringField(schema) {
    for (const [fieldName, field] of Object.entries(schema.fields)) {
      if (field.type === 'String') {
        return fieldName;
      }
    }
    return null;
  }

  function handleModelPart(doc, path, schema, schemaName, config) {
    const val = doc[path];
    const docId = doc._id;
    const classIdForDocPath = getClassIdForDocPath(docId, schemaName, path);

    const fieldType = _.get(schema, `fields.${path}.type`, '');
    if (fieldType.startsWith('LookupObjectID')) {
      const lookupValues = _.castArray(val);
      _.each(lookupValues, lookup => {
        const propertyId = `${classIdForDocPath}{${lookup.table}.${lookup._id.toString()}}|lookup`;
        config.property.push({
          id: propertyId,
          type: 'owl:objectProperty',
        });
        config.propertyAttribute.push({
          id: propertyId,
          domain: getClassIdForDoc(docId, schemaName),
          range: getClassIdForDoc(lookup._id, lookup.table),
          label: lookup.label,
        });
      });
    } else {
      const classId = `${classIdForDocPath}|literal`;
      config.class.push({
        id: classId,
        type: 'rdfs:Literal',
      });
      config.classAttribute.push({
        id: classId,
        label: getLiteralLabel(val, fieldType),
      });

      const propertyId = `${classIdForDocPath}|prop`;
      config.property.push({
        id: propertyId,
        type: 'owl:datatypeProperty',
      });
      config.propertyAttribute.push({
        id: propertyId,
        domain: getClassIdForDoc(docId, schemaName),
        range: classId,
        label: path,
      });
    }
  }

  function getClassIdForDoc(docObjectId, schemaName) {
    return `${schemaName}=${docObjectId.toString()}`;
  }

  function getClassIdForDocPath(docObjectId, schemaName, path) {
    return `${getClassIdForDoc(docObjectId, schemaName)}/${path}`;
  }

  function getLiteralLabel(val, fieldType) {
    if (fieldType.startsWith('String')) {
      return _.castArray(val).join(', ');
    }
    if (fieldType.startsWith('Date')) {
      return _.castArray(val)
        .map(v => v.toLocaleString())
        .join(', ');
    }
    if (fieldType.startsWith('Barcode')) {
      return _.castArray(val).join(', ');
    }
    if (fieldType.startsWith('Number')) {
      return _.castArray(val)
        .map(v => v.toString())
        .join(', ');
    }
    if (fieldType.startsWith('Boolean')) {
      return _.castArray(val)
        .map(v => v.toString())
        .join(', ');
    }
    if (fieldType.startsWith('Location')) {
      return _.castArray(val)
        .map(v => (_.isPlainObject(v) ? JSON.stringify(v) : v.toString()))
        .join(', ');
    }
    if (fieldType.startsWith('Mixed') || fieldType.startsWith('Object')) {
      try {
        return JSON.stringify(val, null, 2);
      } catch (e) {
        return val;
      }
    }

    return val;
  }

  const defaultIgnoredCollections = ['files', 'permissions', 'roles', 'users'];

  async function getWebVOWLConfig(ignoredCollections = defaultIgnoredCollections) {
    const config = getInitialConfig();
    const schemaNames = _.keys(m.appLib.appModel.models).filter(name => !ignoredCollections.includes(name));

    await Promise.map(schemaNames, async schemaName => {
      const schema = m.appLib.appModel.models[schemaName];
      const docs = await m.appLib.db
        .model(schemaName)
        .find()
        .lean()
        .exec();
      return Promise.map(docs, doc => transformDocToWebVOWL(doc, schema, schemaName, config));
    });
    return config;
  }

  m.init = appLib => {
    m.appLib = appLib;
    appLib.addRoute('get', `/getWebVOWLConfig`, [m.getWebVOWLConfig]);
  };

  m.getWebVOWLConfig = async (req, res, next) => {
    try {
      const config = await getWebVOWLConfig();
      res.json({
        success: true,
        data: config,
      });
      next();
    } catch (e) {
      const message = `Unable to get WebVOWLConfig`;
      log.error(message, e.stack);
      res.status(500).json({ success: false, message });
    }
  };

  return m;
};
