const _ = require('lodash');
const Promise = require('bluebird');
const log = require('log4js').getLogger('grouped-recalls-graphql');

module.exports = function () {
  const m = {};

  m.init = (appLib) => {
    m.appLib = appLib;
    const {
      graphqlCompose: { schemaComposer },
      addQuery,
    } = m.appLib.graphQl;

    const queryName = 'groupedRecalls';
    addQuery(queryName, getGroupedRecallsResolver(schemaComposer));
  };

  return m;
};

function getGroupedRecallsResolver(schemaComposer) {
  const recallCollections = {
    openfda: 'recallsOpenfdaDrugs',
    conceptant: 'recallsRes',
  };
  const consoCollectionName = 'drugsRxnormConso';

  const config = {
    name: `groupedRecalls`,
    fields: {
      medicationName: 'String',
      recalls: '[JSON]',
    },
  };
  const type = schemaComposer.createObjectTC(config);
  const resolverName = 'groupedRecallsResolver';

  type.addResolver({
    kind: 'query',
    name: resolverName,
    args: {
      rxcuis: '[String]!',
      status: 'String',
      centerRecommendedDepth: 'String',
      algorithm: schemaComposer.createEnumTC({
        name: 'algorithm',
        values: _.reduce(
          recallCollections,
          (r, value, key) => {
            r[key] = { value: key };
            return r;
          },
          {}
        ),
      }),
    },
    type: [type],
    resolve: async ({ args, context }) => {
      try {
        const { appLib, req } = context;
        const { rxcuis, status, centerRecommendedDepth, algorithm } = args;
        const recallCollectionName = recallCollections[algorithm];

        const action = 'view';
        const inlineContext = appLib.accessUtil.getInlineContext(req);
        const { MONGO } = appLib.butil;

        // check permissions for modelNames
        const modelNames = [recallCollectionName, consoCollectionName];
        const modelConditions = await Promise.map(modelNames, async (modelName) => {
          const scopeConditionsMeta = await appLib.accessUtil.getScopeConditionsMeta(
            appLib.appModel.models[modelName],
            req.permissions,
            inlineContext,
            action
          );
          const scopeConditions = scopeConditionsMeta.overallConditions;
          const conditionForActualRecord = appLib.dba.getConditionForActualRecord(modelName);
          return MONGO.and(conditionForActualRecord, scopeConditions);
        });

        const modelToConditions = modelNames.reduce((res, modelName, i) => {
          res[modelName] = modelConditions[i];
          return res;
        }, {});

        // TODO: add filtering input rxcuis on existence in consoCollectionName?
        const pipeline = [
          {
            $match: {
              $and: [
                modelToConditions[recallCollectionName],
                {
                  'rxCuis.rxCui': { $in: rxcuis },
                  status,
                  centerRecommendedDepth,
                },
              ],
            },
          },
          {
            $project: {
              recallInitiationDate: 1,
              status: 1,
              classification: 1,
              recallingFirm: 1,
              distributionPattern: 1,
              reasonForRecall: 1,
              codeInfo: 1,
              productDescription: 1,
              rxCuis: 1,
            },
          },
          {
            $lookup: {
              from: consoCollectionName,
              let: {
                rxCuis: '$rxCuis',
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        modelToConditions[consoCollectionName],
                        {
                          $in: [
                            '$rxcui',
                            { $map: { input: '$$rxCuis', as: 'rxCuiObj', in: '$$rxCuiObj.rxCui' } },
                          ],
                        },
                      ],
                    },
                  },
                },
                { $limit: 1 }, // medicationInfo may contain multiple medications, retrieve only first medication
                { $project: { _id: 0, medicationName: '$str' } },
              ],
              as: 'medicationInfo',
            },
          },
          {
            $match: {
              medicationInfo: { $ne: [] },
            },
          },
          { $unwind: '$medicationInfo' },
          {
            $group: {
              _id: '$medicationInfo.medicationName',
              recalls: {
                $push: {
                  // don't include medicationInfo
                  recallInitiationDate: '$$ROOT.recallInitiationDate',
                  status: '$$ROOT.status',
                  classification: '$$ROOT.classification',
                  recallingFirm: '$$ROOT.recallingFirm',
                  distributionPattern: '$$ROOT.distributionPattern',
                  reasonForRecall: '$$ROOT.reasonForRecall',
                  codeInfo: '$$ROOT.codeInfo',
                  productDescription: '$$ROOT.productDescription',
                  rxCuis: '$$ROOT.rxCuis',
                },
              },
            },
          },
          { $project: { medicationName: '$_id', recalls: 1 } },
        ];

        const res = await appLib.db.collection(recallCollectionName).aggregate(pipeline).toArray();
        return res;
      } catch (e) {
        log.error(e);
        throw new Error(`Unable to find grouped recalls`);
      }
    },
  });

  return type.getResolver(resolverName);
}
