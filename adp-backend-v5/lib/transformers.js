const Promise = require('bluebird');
const { ValidationError } = require('./errors');
const { getParentInfo } = require('./util/unified-approach');
const { getFunction } = require('./util/memoize');

/**
 * @module transformers
 * Implements functionality required for "transform" attribute for the app model
 * NOTE: leaving log.trace calls commented out here because debugging those is very slow in WebStorm
 */
module.exports = (appLib) => {
  const async = require('async');
  const _ = require('lodash');
  const m = {};
  m.appLib = appLib;

  /**
   * This method traverses the data object (unlike most other methods in this lib traversing the appModel) and calls transformers for all children in the data tree but limited to changesPath
   * For instance it will call transforms for data.child1[0].child2[0].child3 as well as data.child1[15].child2[3].child3 is these are present in the data, but considering chagesPath
   * @param type the type of handler to process (validator or transformer)
   * @param modelName
   * @param userContext
   * @param handler the name or spec of the handler (transformer or validator)
   * @param appModelPart the model part to traverse
   * @param data is the document data to traverse
   * @param lodashPath is the string containing path compatible with lodash _.get and _set
   * @param path array containing model-compatible path to the current point of traversal
   * @param changesPath arraycontaining path to the object starting from which the changes should apply. Example: ['fields','encounters', 'e25b0722e689c89cedd732c5', 'vitalSigns']
   * @param cb callback to be called in the end of this method
   */
  m.traverseDocAndCallProcessor = (
    type,
    modelName,
    userContext,
    handler,
    appModelPart,
    wholeModel,
    data,
    lodashPath,
    path,
    changesPath,
    cb
  ) => {
    // log.trace(`> traverseDocAndCallProcessor "${type}" "${JSON.stringify(handler)}" for lodashPath "${lodashPath}" path ${path} changesPath ${changesPath}`);
    if (lodashPath[0] === '.') {
      lodashPath = lodashPath.substr(1);
    }

    if (path.length === 0) {
      // time to call handler
      const { indexes, index, parentData } = getParentInfo(appLib.appModel.models[modelName], data, lodashPath);
      const context = {
        path: lodashPath,
        data: _.get(data, lodashPath),
        row: data,
        userContext,
        action: userContext.action,
        fieldSchema: appModelPart,
        modelSchema: wholeModel,
        indexes,
        index,
        parentData,
        handlerSpec: handler,
        modelName,
        collectionName: appLib.appModel.models[modelName].collectionName || modelName,
      };

      // log.trace(`>> Calling "${type}" hook "${JSON.stringify(handler)}" for "${lodashPath}" equal "${_.get(data, lodashPath)}", data: ${JSON.stringify(data)}`);
      if (type === 'transform') {
        if (m.appLib.appModelHelpers.Transformers[handler]) {
          const boundHandler = m.appLib.appModelHelpers.Transformers[handler].bind(context);
          boundHandler(cb);
        } else {
          cb(`Unknown transform function "${handler}" in "${path.join('.')}"`);
        }
      } else if (type === 'synthesize') {
        const synthesizerCode = _.get(handler, 'code');
        if (synthesizerCode) {
          const synthesizerFunc = getFunction(`return ${synthesizerCode}`);
          // TODO: transformers should not depend on ValidatorUtils, as option move out 'getValue' from ValidatorsUtils
          // const val = appLib.appModelHelpers.ValidatorUtils.getValue(data, appModelPart, lodashPath);
          // const val = data;
          // const { action } = userContext;
          try {
            // const synthesizedValue = synthesizerFunc.call(data, val, data, appModelPart, action);
            const synthesizedValue = synthesizerFunc.call(context);
            _.set(data, lodashPath, synthesizedValue);
            return cb();
          } catch (e) {
            cb(`Error occurred in synthesizer code "${synthesizerCode}" in "${path.join('.')}"`);
          }
        }

        const handlerName = _.get(handler, 'synthesizer', handler);
        if (m.appLib.appModelHelpers.Synthesizers[handlerName]) {
          const boundHandler = m.appLib.appModelHelpers.Synthesizers[handlerName].bind(context);
          boundHandler(cb);
        } else {
          cb(`Unknown synthesizer function "${handlerName}" in "${path.join('.')}"`);
        }
      } else if (type === 'validate') {
        const validatorFunc = m.appLib.appModelHelpers.Validators[handler.validator];
        if (validatorFunc) {
          const boundHandler = validatorFunc.bind(context);
          process.nextTick(() => {
            boundHandler((err) => {
              if (err) {
                cb(`${appModelPart.fullName}: ${err}`);
              } else {
                cb();
              }
            });
          });
        } else {
          cb(`Unknown validate function "${JSON.stringify(handler)}" in "${path.join('.')}"`);
        }
      } else {
        cb(`Unknown handler type ${type}`);
      }
    } else {
      const head = path.slice(0, 1)[0];
      const changesHead = changesPath.length > 0 ? changesPath.slice(0, 1)[0] : false;

      if (appModelPart.type === 'AssociativeArray') {
        const assocArray = _.entries(lodashPath === '' ? data : _.get(data, lodashPath));
        async.eachOfSeries(
          assocArray,
          ([key], idx, arrayCb) => {
            m.traverseDocAndCallProcessor(
              type,
              modelName,
              userContext,
              handler,
              appModelPart[head],
              wholeModel,
              data,
              `${lodashPath}.${key}`,
              path.slice(1),
              changesPath.slice(1),
              arrayCb
            );
          },
          cb
        );
      } else if (appModelPart.type === 'Array') {
        async.eachOfSeries(
          lodashPath === '' ? data : _.get(data, lodashPath),
          (el, idx, arrayCb) => {
            // log.trace( `>>>> Iterating head: ${head} lodashPath: ${lodashPath} idx: ${idx} changesHead: ${changesHead} el._id: ${el._id}` );
            if (!changesHead || `${el._id}` === changesHead) {
              // changesHead narrows array iteration to just specific ID
              m.traverseDocAndCallProcessor(
                type,
                modelName,
                userContext,
                handler,
                appModelPart[head],
                wholeModel,
                data,
                `${lodashPath}.${idx}`,
                path.slice(1),
                changesPath.slice(1),
                arrayCb
              );
            } else {
              arrayCb();
            }
          },
          cb
        );
      } else if (appModelPart.type === 'Schema' || appModelPart.type === 'Object') {
        m.traverseDocAndCallProcessor(
          type,
          modelName,
          userContext,
          handler,
          appModelPart[head],
          wholeModel,
          data,
          lodashPath,
          path.slice(1),
          changesPath.slice(1),
          cb
        );
      } else {
        m.traverseDocAndCallProcessor(
          type,
          modelName,
          userContext,
          handler,
          appModelPart[head],
          wholeModel,
          data,
          `${lodashPath}.${head}`,
          path.slice(1),
          changesPath.slice(1),
          cb
        );
      }
    }
  };
  m.traverseDocAndCallProcessorPromisified = Promise.promisify(m.traverseDocAndCallProcessor);
  /**
   * Asynchronously traverses appModel.models.model starting from root, calls transform for the attributes that have one
   * NOTE if the path array will end with 'fields' then this will not recurse deeper, so make sure this is not happening and strip the final 'fields'
   * @param root part of the model being traversed
   * @param path the path to the root expressed as an array
   * @param processor function(part, key, path, cb) that will be called for each node
   * @param cb callback will be called in the end of traverse
   */
  m.traverseAppModel = (root, path, processor, cb) => {
    function traverseAppModelPart(part, key, tPath, tCb) {
      async.series(
        [
          (cb1) => {
            // log.trace( `A:${part} R:${root} P:${path} K:${key}` );
            if (key === 'fields') {
              async.eachOfSeries(
                part,
                (fVal, fKey, fCb) => {
                  traverseAppModelParts(fVal, _.concat(tPath, fKey), fCb);
                },
                cb1
              );
            } else {
              cb1();
            }
          },
          (cb2) => {
            processor(part, key, tPath, cb2);
          },
        ],
        tCb
      );
    }

    function traverseAppModelParts(parts, tPath, tCb) {
      async.eachOfSeries(
        parts,
        (val, key, asyncCb) => {
          traverseAppModelPart(val, key, _.concat(tPath, key), asyncCb);
        },
        tCb
      );
    }

    traverseAppModelParts(root, path, cb);
  };

  /**
   * Utility method user in preSave and postInit. It starts traversing the appModel.models.model tree and calls transformers
   * NOTE: it traverses App Model, so it doesn't know how many elements are there in the subschema data.
   * So it's up to processor to narrow down processing to specific element of the subschema
   * @param attributes lists the attributes to find (like "transform" and "validate")
   * @param modelName name of the model as referenced in appModel.models
   * @param changesPath the part of the data where the changes occurred represented as an array. Example: [58ed793cd78de0745f84e2dd,encounters,3550cf00d207fe624eaaa918,vitalSigns,e44c93b0e80f393af37367eb]
   * @param processor will be called to process detected attributes with arguments <attribute name/type>, <name of function to call>, <path to the element>
   * @param cb
   */
  m.processAppModel = (attributes, modelName, changesPath, processor, cb) => {
    if (m.appLib.appModel.models[modelName]) {
      let appModelPath = _([modelName])
        .concat(changesPath)
        .map((val, key) => (key < 1 || key % 2 === 0 ? val : 'fields'))
        .value(); // removes _id parts from the changesPath
      // log.trace( `processAppModel attributes: "${attributes}" model: "${modelName}" appModelPath: ${appModelPath} changesPath: "${changesPath}"` );
      if (appModelPath[appModelPath.length - 1] === 'fields') {
        appModelPath = appModelPath.slice(0, appModelPath.length - 1);
      }
      m.traverseAppModel(
        _.get(m.appLib.appModel.models, appModelPath.join('.')),
        appModelPath,
        (val, key, path, tCb) => {
          if (_.includes(attributes, key)) {
            Promise.mapSeries(val, (functionName) => processor(key, functionName, val, path))
              .then(() => tCb())
              .catch((err) => tCb(err));
          } else {
            tCb();
          }
        },
        (err) => {
          if (err) {
            cb(err);
          } else {
            cb();
          }
        }
      );
    } else {
      cb(`Model '${modelName}' was not found for validation and transformation purposes`);
    }
  };

  m.processAppModelPromisified = Promise.promisify(m.processAppModel);

  m.removeVirtualFields = (appModel, data, path = []) => {
    _.each(appModel.fields, (field, fieldKey) => {
      const fieldPath = path.concat(fieldKey);
      if (field.virtual === true) {
        if (_.isArray(data)) {
          _.each(data, (doc) => {
            appLib.accessUtil.clearField(doc, fieldPath, field);
          });
        } else {
          appLib.accessUtil.clearField(data, fieldPath, field);
        }
      }
      // go deeper to find nested fields containing virtual attribute
      if (field.fields) {
        m.removeVirtualFields(field, data, fieldPath);
      }
    });
  };

  /**
   * Runs Transformations on data before saving data to the database.
   * This traverses the entire model definition and calls transformation methods as specified in the app model
   * @param modelName modelName
   * @param userContext context for retrieving info about user
   * @param data the data to traverse. This method may need traverse only part of the document data specified by changesPath
   * @param changesPath - the part of the doc where the changes occurred represented as an array. Example: [58ed793cd78de0745f84e2dd,encounters,3550cf00d207fe624eaaa918,vitalSigns,e44c93b0e80f393af37367eb]. This path is a mix of appModel path and data path. Note that transformation will be done for the whole data, but validation will be performed only for the changed part.
   */
  m.preSaveTransformData = async (modelName, userContext, data, changesPath) => {
    try {
      await processAttribute('validate', changesPath);
      await processAttribute('transform', []);
      await processAttribute('synthesize', []);
    } catch (e) {
      throw new ValidationError(e.message);
    }

    const appModel = appLib.appModel.models[modelName];
    m.removeVirtualFields(appModel, data);

    function processAttribute(attribute, pChangesPath) {
      return m.processAppModelPromisified([attribute], modelName, pChangesPath, (type, handler, val, path) => {
        const name = Array.isArray(handler) ? handler[0] : handler;
        if (!name) {
          return Promise.resolve();
        }
        // NOTE: first element is always the model name, the last one is "transform
        // NOTE: It's up to traverseDocAndCallProcessor method to narrow down the validation to specific element of the subschema array
        // Model traversing can't filter this part.
        const wholeModel = m.appLib.appModel.models[path[0]];
        const appModelPart = wholeModel;
        return m.traverseDocAndCallProcessorPromisified(
          type,
          modelName,
          userContext,
          name,
          appModelPart,
          wholeModel,
          data,
          '',
          path.slice(1, path.length - 1),
          pChangesPath
        );
      });
    }
  };

  /**
   * Runs Transformations on data after retrieving data from the database
   * WARNING: do not use lambda (=>) function for this function, always use "function() {}" syntax in order to establish "this"
   * @param data the data (regular object) to run post-processing for. Post-=processing always runs for the entire document data
   * @param modelName
   * @param userContext
   * @param changesPath
   */
  m.postInitTransformData = (modelName, userContext, data, changesPath = []) =>
    // log.trace(`postInitTransformData model ${modelName} data: ${JSON.stringify(data)}`);
    m.processAppModelPromisified(['transform', 'synthesize'], modelName, changesPath, (type, handler, val, path) => {
      // for example in "transform": [["heightImperialToMetric", "heightMetricToImperial"]]
      // heightImperialToMetric - input handler, called before saving into db
      // heightMetricToImperial - output handler, called before sending response to client
      const isOutputHandler = Array.isArray(handler) && handler.length > 1;
      const wholeModel = m.appLib.appModel.models[path[0]];
      const appModelPart = wholeModel;
      if (type === 'transform' && isOutputHandler) {
        const name = handler[1];
        if (name) {
          return m.traverseDocAndCallProcessorPromisified(
            type,
            modelName,
            userContext,
            name,
            appModelPart,
            wholeModel,
            data,
            '',
            path.slice(1, path.length - 1),
            []
          ); // first element is always the model name, the last one is "transform
        }
      }
      const pathToVirtualAttr = path.slice(0, -1);
      pathToVirtualAttr.push('virtual');
      const isVirtual = _.get(m.appLib.appModel.models, pathToVirtualAttr);
      if (type === 'synthesize' && isVirtual) {
        return m.traverseDocAndCallProcessorPromisified(
          type,
          modelName,
          userContext,
          handler,
          appModelPart,
          wholeModel,
          data,
          '',
          path.slice(1, path.length - 1),
          []
        );
      }
      return Promise.resolve();
    });

  return m;
};
