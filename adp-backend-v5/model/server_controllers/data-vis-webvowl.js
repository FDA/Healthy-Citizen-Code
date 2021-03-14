const _ = require('lodash');
const log = require('log4js').getLogger('data-vis-webvowl');
const commons = require('../lib/src/data_vis_common');

module.exports = function () {
  const m = {};

  m.init = (appLib) => {
    m.appLib = appLib;
    appLib.addRoute('get', '/getFdaVipWebVOWLConfig', [appLib.isAuthenticated, getFdaVipWebVOWLConfig]);
  };

  async function getFdaVipWebVOWLConfig(req, res) {
    try {
      const dbData = await commons.getDbData(m.appLib, req);
      const config = m.transformRelationshipsToWebVOWL(dbData);
      res.json(config);
    } catch (e) {
      log.error(e.stack);
      return res.json({ success: false, data: null, message: `Unable to get WebVOWL config.` });
    }
  }

  function getObjAnnotations(obj, model) {
    const annotations = {};
    const ignoredFields = ['name', '_id', 'creator'];
    _.each(obj, (val, fieldName) => {
      if (ignoredFields.includes(fieldName.toLowerCase()) || val === undefined || val == null) {
        return;
      }
      if (fieldName === 'type') {
        annotations.EntityType = [
          {
            identifier: 'EntityType',
            language: 'undefined',
            value: val.name,
            type: 'label',
          },
        ];
        return;
      }
      const label = val.fullName || _.startCase(fieldName);
      annotations[label] = [
        {
          identifier: label,
          language: 'undefined',
          value: commons.getVal(obj, fieldName, model),
          type: 'label',
        },
      ];
    });
    return annotations;
  }

  m.transformRelationshipsToWebVOWL = (relationships) => {
    transformOntologyListKeys(relationships);

    const config = getInitialConfig();
    const addedEntitiesSet = new Set();

    _.each(relationships, (r) => {
      // arrow will be shown from domain entity to range entity: domain -> range
      // relationships might have only domain without range and other relationship info

      const entityModel = m.appLib.appModel.models.entities;
      // add domain
      const domainClassId = _.get(r, 'domain._id', '').toString();
      const domainAnnotations = getObjAnnotations(r.domain, entityModel);
      if (domainClassId && !addedEntitiesSet.has(domainClassId)) {
        addedEntitiesSet.add(domainClassId);
        config.class.push({
          id: domainClassId,
          type: _.get(r, 'domain.type.ontologyElement'),
        });
        config.classAttribute.push({
          id: domainClassId,
          label: r.domain.name,
          annotations: domainAnnotations,
        });
      }

      // add range
      const rangeClassId = _.get(r, 'range._id', '').toString();
      const rangeAnnotations = getObjAnnotations(r.range, entityModel);
      if (rangeClassId && !addedEntitiesSet.has(rangeClassId)) {
        addedEntitiesSet.add(rangeClassId);
        config.class.push({
          id: rangeClassId,
          type: r.range.type.ontologyElement,
        });
        config.classAttribute.push({
          id: rangeClassId,
          label: r.range.name,
          annotations: rangeAnnotations,
        });
      }

      // add arrow
      const propertyId = (r._id || '').toString();
      const ontologyElement = _.get(r, 'type.ontologyElement');
      const propertyType = getPropertyType(ontologyElement);
      if (propertyId && domainClassId && rangeClassId && propertyType) {
        config.property.push({ id: propertyId, type: propertyType });
        const typeName = _.get(r, 'type.name', '');
        config.propertyAttribute.push({
          id: propertyId,
          domain: domainClassId,
          range: rangeClassId,
          label: r.name ? `${typeName} ${r.name}` : typeName,
        });
      }
    });

    return config;

    function transformOntologyListKeys(_relationships) {
      const { models } = m.appLib.appModel;
      const entityOntologyElements = models.entityTypes.fields.ontologyElement.list.values;
      const relationshipOntologyValues = models.relationshipTypes.fields.ontologyElement.list.values;
      _.each(_relationships, (r) => {
        const domainOntologyListKey = _.get(r, 'domain.type.ontologyElement');
        const domainOntologyElement = entityOntologyElements[domainOntologyListKey];
        if (domainOntologyElement) {
          _.set(r, 'domain.type.ontologyElement', domainOntologyElement);
        }

        const rangeOntologyListKey = _.get(r, 'range.type.ontologyElement');
        const rangeOntologyElement = entityOntologyElements[rangeOntologyListKey];
        if (rangeOntologyElement) {
          _.set(r, 'range.type.ontologyElement', rangeOntologyElement);
        }

        const typeOntologyListKey = _.get(r, 'type.ontologyElement');
        const typeOntologyElement = relationshipOntologyValues[typeOntologyListKey];
        if (typeOntologyElement) {
          _.set(r, 'type.ontologyElement', typeOntologyElement);
        }
      });
    }

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

    function getPropertyType(ontologyElement) {
      if (ontologyElement === 'External Property') return 'rdf:Property';
      if (ontologyElement === 'rdfs:range') return 'rdf:Property';
      return ontologyElement;
    }
  };

  return m;
};
