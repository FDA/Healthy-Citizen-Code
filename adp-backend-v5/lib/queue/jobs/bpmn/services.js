const _ = require('lodash');
const { ruleCollectionName } = require('../dmn');
const { getValidatedDmnUtilInstance, processDmnVariables } = require('../dmn/dmn-util');
const { getAimlResult } = require('../aiml/util');

function getServices(db, log) {
  const m = {};

  m.lookup = async ({ value, collectionName, fieldName }) => {
    const doc = await db
      .collection(collectionName)
      .findOne({ [fieldName]: { $eq: value }, deletedAt: new Date(0) }, { _id: 1 });
    return !!doc;
  };

  m.mux = ({ ws, vs }) => {
    if (!Array.isArray(ws) || !Array.isArray(vs) || ws.length !== vs.length) {
      throw new Error(`Invalid params. Weights and values should be arrays of same length`);
    }

    return ws.reduce((result, w, index) => {
      result += w * vs[index];
      return result;
    }, 0);
  };

  m.dmn = async ({ name, variables }) => {
    const dmnRuleRecord = await db.collection(ruleCollectionName).findOne({ name: { $eq: name } });
    if (!dmnRuleRecord) {
      throw new Error(`Unable to find dmn rule with name '${name}'`);
    }
    const { dmnXml, decisionId } = dmnRuleRecord.definition;
    const dmnUtilInstance = await getValidatedDmnUtilInstance(dmnXml, decisionId);
    const result = await processDmnVariables(dmnUtilInstance, _.castArray(variables));
    return _.isArray(variables) ? result : result[0];
  };

  m.aiml = ({ endpoint, variables }) => {
    return getAimlResult(endpoint, variables, log);
  };

  return m;
}

function getServicesScheme() {
  return {
    services: {
      lookup: {
        fields: {
          value: {
            type: 'String',
            description: 'Lookup value',
            required: true,
          },
          collectionName: {
            type: 'String',
            description: 'Lookup collection name',
            required: true,
          },
          fieldName: {
            type: 'String',
            description: 'Lookup field name',
            required: true,
          },
        },
      },
      mux: {
        fields: {
          ws: {
            type: 'Number[]',
            description: 'Array of weights',
            required: true,
          },
          vs: {
            type: 'Number[]',
            description: 'Array of values',
            required: true,
          },
        },
      },
      dmn: {
        fields: {
          name: {
            type: 'Number[]',
            description: 'DMN rule name',
            required: true,
          },
          variables: {
            type: 'AssociativeArray',
            description: 'Variables',
            required: true,
          },
        },
      },
      aiml: {
        fields: {
          endpoint: {
            type: 'String',
            description: 'AIML service endpoint',
            required: true,
          },
          variables: {
            type: 'AssociativeArray',
            description: 'Variables',
            required: true,
          },
        },
      },
    },
  };
}

module.exports = {
  getServices,
  getServicesScheme,
};
