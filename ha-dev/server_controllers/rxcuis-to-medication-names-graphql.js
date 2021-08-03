const Promise = require('bluebird');

module.exports = function () {
  const m = {};

  m.init = (appLib) => {
    m.appLib = appLib;
    m.log = appLib.getLogger('rxcuis-to-medication-names-graphql');
    const {
      graphqlCompose: { schemaComposer },
      addQuery,
    } = m.appLib.graphQl;

    const queryName = 'getDrugsRxnormConsoSingleMedicationNames';
    addQuery(queryName, getDrugsRxnormConsoSingleMedicationNames(schemaComposer));
  };

  function getDrugsRxnormConsoSingleMedicationNames(schemaComposer) {
    const config = {
      name: `singleMedicationNames`,
      fields: {
        rxcuiToMedicationName: 'JSON',
      },
    };
    const type = schemaComposer.createObjectTC(config);
    const resolverName = 'getDrugsRxnormConsoSingleMedicationNames';
    const consoCollectionName = 'drugsRxnormConso';

    type.addResolver({
      kind: 'query',
      name: resolverName,
      args: {
        rxcuis: '[String]!',
      },
      type,
      resolve: async ({ args, context }) => {
        try {
          const { appLib, req } = context;
          const { rxcuis } = args;

          const action = 'view';
          const inlineContext = appLib.accessUtil.getInlineContext(req);
          const userPermissions = appLib.accessUtil.getReqPermissions(req);
          const conditionForActualRecord = appLib.dba.getConditionForActualRecord(
            consoCollectionName
          );

          // check permissions for modelNames
          const scopeConditionsMeta = await appLib.accessUtil.getScopeConditionsMeta(
            appLib.appModel.models[consoCollectionName],
            userPermissions,
            inlineContext,
            action
          );
          const scopeConditions = scopeConditionsMeta.overallConditions;
          const consoConditions = appLib.butil.MONGO.and(conditionForActualRecord, scopeConditions);

          // TODO: add filtering input rxcuis on existence in consoCollectionName?
          const rxcuiToMedicationName = {};
          await Promise.map(rxcuis, async (rxcui) => {
            const doc = await appLib.db
              .collection(consoCollectionName)
              .findOne({ ...consoConditions, rxcui }, { str: 1 });
            const medicationName = doc ? doc.str : null;
            rxcuiToMedicationName[rxcui] = medicationName;
          });

          return { rxcuiToMedicationName };
        } catch (e) {
          m.log.error(e);
          throw new Error(`Unable to find medication names.`);
        }
      },
    });

    return type.getResolver(resolverName);
  }

  return m;
};
