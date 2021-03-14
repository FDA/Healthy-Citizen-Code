const Promise = require('bluebird');
const _ = require('lodash');
const YAML = require('yaml');
const sanitizeHtml = require('sanitize-html');
const dayjs = require('dayjs');

function transformFile(file) {
  return file.name;
}

function clearTags(text) {
  return sanitizeHtml(text, {
    allowedTags: [],
    allowedAttributes: {},
  });
}

function formatDateTime(value, type) {
  const dateFormats = {
    Date: 'M/D/YYYY',
    Time: 'h:mm a',
    DateTime: 'M/D/YYYY h:mm a',
  };

  return dayjs(value).format(dateFormats[type]);
}

module.exports = {
  getDbData: async (appLib, req) => {
    const action = 'view';
    const inlineContext = appLib.accessUtil.getInlineContext(req);
    const modelNames = ['relationships', 'entities', 'entityTypes', 'relationshipTypes'];
    const { MONGO } = appLib.butil;

    const modelConditions = await Promise.map(modelNames, async modelName => {
      const scopeConditionsMeta = await appLib.accessUtil.getScopeConditionsMeta(
        appLib.appModel.models[modelName],
        req.permissions,
        inlineContext,
        action,
      );
      const scopeConditions = scopeConditionsMeta.overallConditions;
      const conditionForActualRecord = appLib.dba.getConditionForActualRecord(modelName);
      return MONGO.and(conditionForActualRecord, scopeConditions);
    });

    const modelToConditions = modelNames.reduce((res, modelName, i) => {
      res[modelName] = modelConditions[i];
      return res;
    }, {});

    const notHidden = { hidden: { $ne: true } };

    const fullRelationshipsPipeline = [
      {
        $match: { $and: [modelToConditions.entities, notHidden] },
      },
      {
        $project: {
          _id: 0,
          domain: '$$ROOT',
        },
      },
      {
        $lookup: {
          from: 'relationships',
          as: 'relationship',
          let: { domainId: '$domain._id' },
          pipeline: [
            {
              $match: {
                $and: [
                  modelToConditions.relationships,
                  notHidden,
                  { $expr: { $eq: ['$domain._id', '$$domainId'] } },
                ],
              },
            },
          ],
        },
      },
      { $unwind: '$relationship' },
      {
        $lookup: {
          from: 'entityTypes',
          as: 'domain.type',
          let: { domainTypeId: '$domain.type._id' },
          pipeline: [
            {
              $match: {
                $and: [
                  modelToConditions.entityTypes,
                  notHidden,
                  { $expr: { $eq: ['$_id', '$$domainTypeId'] } },
                ],
              },
            },
          ],
        },
      },
      { $unwind: '$domain.type' },
      {
        $lookup: {
          from: 'entities',
          as: 'range',
          let: { rangeId: '$relationship.range._id' },
          pipeline: [
            {
              $match: {
                $and: [modelToConditions.entities, notHidden, { $expr: { $eq: ['$_id', '$$rangeId'] } }],
              },
            },
          ],
        },
      },
      { $unwind: '$range' },
      {
        $lookup: {
          from: 'entityTypes',
          as: 'range.type',
          let: { rangeTypeId: '$range.type._id' },
          pipeline: [
            {
              $match: {
                $and: [
                  modelToConditions.entityTypes,
                  notHidden,
                  { $expr: { $eq: ['$_id', '$$rangeTypeId'] } },
                ],
              },
            },
          ],
        },
      },
      // { $unwind: '$range.type' },
      { $unwind: { path: '$range.type', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'relationshipTypes',
          as: 'relationship.type',
          let: { typeId: '$relationship.type._id' },
          pipeline: [
            {
              $match: {
                $and: [
                  modelToConditions.relationshipTypes,
                  notHidden,
                  { $expr: { $eq: ['$_id', '$$typeId'] } },
                ],
              },
            },
          ],
        },
      },
      { $unwind: { path: '$relationship.type', preserveNullAndEmptyArrays: true } },
      {
        $replaceRoot: {
          newRoot: { $mergeObjects: ['$relationship', { range: '$range', domain: '$domain' }] },
        },
      },
    ];
    const relationships = await appLib.db
      .collection('entities')
      .aggregate(fullRelationshipsPipeline)
      .toArray();

    const entityIdsInRelationships = [];
    _.each(relationships, rel => {
      entityIdsInRelationships.push(rel.domain._id);
      entityIdsInRelationships.push(rel.range._id);
    });

    const noRelationshipsPipeline = [
      {
        $match: {
          $and: [
            { _id: { $nin: entityIdsInRelationships } },
            modelToConditions.entities,
            notHidden,
          ],
        },
      },
      {
        $lookup: {
          from: 'entityTypes',
          as: 'type',
          let: { rangeTypeId: '$type._id' },
          pipeline: [
            {
              $match: {
                $and: [
                  modelToConditions.entityTypes,
                  notHidden,
                  { $expr: { $eq: ['$_id', '$$rangeTypeId'] } },
                ],
              },
            },
          ],
        },
      },
      { $unwind: '$type' },
    ];
    const entitiesWithoutRelationships = await appLib.db
      .collection('entities')
      .aggregate(noRelationshipsPipeline)
      .toArray();

    const onlyDomainRelationships = entitiesWithoutRelationships.map(entity => ({ domain: entity }));
    // adding onlyDomainRelationships is kind of hack to not to rework everything related to such format
    relationships.push(...onlyDomainRelationships);

    return relationships;
  },
  getVal: (obj, fieldName, model) => {
    const val = obj[fieldName];
    const modelPart = model.fields[fieldName];
    const type = _.get(modelPart, 'type', '');

    if (type === 'File') {
      return transformFile(val);
    }
    if (type === 'File[]') {
      return val && val.length ? _.map(val, file => transformFile(file)).join(', ') : '';
    }
    if (type.includes('String')) {
      return _.castArray(val).join(', ');
    }
    if (type.includes('LookupObjectID')) {
      return _.map(_.castArray(val), x=>x.label).join(', ');
    }
    if (type.includes('ObjectID')) {
      return _.castArray(val).join(', ');
    }
    if (type === 'Html') {
      return clearTags(val);
    }
    if (type === 'Date' || type === 'Time' || type === 'DateTime') {
      return formatDateTime(val, type);
    }
    return YAML.stringify(val, 2);
  },
};
