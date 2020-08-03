const _ = require('lodash');
const JSON5 = require('json5');
const { ruleCollectionName } = require('../dmn');
const { getValidatedDmnUtilInstance, processDmnVariables } = require('../dmn/dmn-util');
const { getAimlResult } = require('../aiml/util');

// Wraps a service into a function with following goals:
// 1. Otherwise bpmn-elements/dist/src/tasks/ServiceImplementation.js throws an error if "implementation did not resolve to a function".
// Example: implementation="${ environment.services.fn(args) }"
// 2. Pass executionContext as a context to be able to address variables through this.environment.variables
// 3. Validate that every service function takes a single string argument encoded with encodeURIComponent and parsable as object.
// 4. Pass object to service function as argument.
function wrapServices(services) {
  _.each(services, (serviceFn, serviceName) => {
    services[serviceName] = function (encodedArgsString) {
      const decodedArgs = decodeURIComponent(encodedArgsString);
      let argsObj;
      try {
        argsObj = JSON5.parse(decodedArgs);
      } catch (e) {
        throw `Invalid args passed '${encodedArgsString}', should be a string parsable to object`;
      }
      if (!_.isPlainObject(argsObj)) {
        throw `Invalid args passed '${encodedArgsString}' should be a string parsable to object`;
      }

      return async (executionContext, callback) => {
        const result = await serviceFn.call(executionContext, argsObj);
        callback(null, result);
      };
    };
  });
  return services;
}

function getServices(db, log) {
  const m = {};

  m.lookup = async function ({ value, collectionName, fieldName }) {
    const doc = await db
      .collection(collectionName)
      .findOne({ [fieldName]: { $eq: value }, deletedAt: new Date(0) }, { _id: 1 });
    return !!doc;
  };

  m.mux = function ({ ws, vs }) {
    if (!_.isArray(ws) || !_.isArray(vs) || ws.length !== vs.length) {
      throw new Error(`Invalid params. Weights and values should be arrays of same length`);
    }

    const { data } = this.environment.variables;
    const invalidFieldPaths = vs.filter((fieldPath) => !_.isNumber(_.get(data, fieldPath)));
    if (!_.isEmpty(invalidFieldPaths)) {
      throw new Error(`Invalid 'vs' fields: ${invalidFieldPaths.join(', ')}. Must be fields referring numbers.`);
    }

    return ws.reduce((result, w, index) => {
      const fieldPath = vs[index];
      const fieldValue = _.get(data, fieldPath);
      result += w * fieldValue;
      return result;
    }, 0);
  };

  m.dmn = async function ({ name }) {
    const dmnRuleRecord = await db.collection(ruleCollectionName).findOne({ name: { $eq: name } });
    if (!dmnRuleRecord) {
      throw new Error(`Unable to find dmn rule with name '${name}'`);
    }
    const { dmnXml, decisionId } = dmnRuleRecord.definition;
    const { dmnUtilInstance, error } = await getValidatedDmnUtilInstance(dmnXml, decisionId);
    if (error) {
      throw new Error(error);
    }

    const { data } = this.environment.variables;
    const result = await processDmnVariables(dmnUtilInstance, _.castArray(data));
    return _.isArray(data) ? result : result[0];
  };

  m.aiml = function ({ endpoint }) {
    const { data } = this.environment.variables;
    return getAimlResult(endpoint, data, log);
  };

  return wrapServices(m);
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
            type: 'String[]',
            description: 'Array of field names to get value from',
            required: true,
          },
        },
      },
      dmn: {
        fields: {
          name: {
            type: 'String',
            description: 'DMN rule name',
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
        },
      },
    },
  };
}

module.exports = {
  getServices,
  getServicesScheme,
};
