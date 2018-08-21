/**
 * @module transformers
 * Implements functionality required for "transform" attribute for the app model
 * NOTE: leaving log.trace calls commented out here because debugging those is very slow in WebStorm
 * TODO: this code will only be used on the server side, so I can rewrite it in a better way, so parameters no longer need to be passed via "this"
 */
module.exports = function (appLib) {

  const mongoose = require("mongoose");
  const log = require('log4js').getLogger('lib/transformers');
  const fs = require("fs");
  const merge = require("merge");
  const async = require("async");
  const _ = require('lodash');
  // const butil = require('./backend-util')();

  // butil.loadValidators();
  // butil.loadTransformers();
  // butil.loadSynthesizers();

  const Schema = mongoose.Schema;

  const m = {};
  m.appLib = appLib;

  /**
   * This method traverses the data object (unlike most other methods in this lib traversing the appModel) and calls transformers for all children in the data tree but limited to changesPath
   * For instance it will call transforms for data.child1[0].child2[0].child3 as well as data.child1[15].child2[3].child3 is these are present in the data, but considering chagesPath
   * @param type the type of handler to process (validator or transformer)
   * @param handler the name or spec of the handler (transformer or validator)
   * @param appModelPart the model part to traverse
   * @param data is the document data to traverse
   * @param lodashPath is the string containing path compatible with lodash _.get and _set
   * @param path array containing model-compatible path to the current point of traversal
   * @param changesPath arraycontaining path to the object starting from which the changes should apply. Example: ['fields','encounters', 'e25b0722e689c89cedd732c5', 'vitalSigns']
   * @param cb callback to be called in the end of this method
   */
  m.traverseDocAndCallProcessor = function (type, modelName, userContext, handler, appModelPart, data, lodashPath, path, changesPath, cb) {
    //log.trace(`> traverseDocAndCallProcessor "${type}" "${JSON.stringify(handler)}" for lodashPath "${lodashPath}" path ${path} changesPath ${changesPath}`);
    if (lodashPath[0] == '.') {
      lodashPath = lodashPath.substr(1);
    }
    if (path.length == 0) { // time to call handler
      //log.trace(`>> Calling "${type}" hook "${JSON.stringify(handler)}" for "${lodashPath}" equal "${_.get(data, lodashPath)}", data: ${JSON.stringify(data)}`);
      if ('transform' == type) {
        if (m.appLib.appModelHelpers.Transformers[handler]) {
          let boundHandler = m.appLib.appModelHelpers.Transformers[handler].bind(data);
          boundHandler(lodashPath, appModelPart, userContext, cb);
        } else {
          cb(`Unknown transform function "${handler}" in "${path.join('.')}"`);
        }
      } else if ('synthesize' == type) {
        let handlerName = _.get(handler, 'synthesizer', handler)
        if (m.appLib.appModelHelpers.Synthesizers[handlerName]) {
          let boundHandler = m.appLib.appModelHelpers.Synthesizers[handlerName].bind(data);
          boundHandler(lodashPath, appModelPart, userContext, cb);
        } else {
          cb(`Unknown synthesizer function "${handlerName}" in "${path.join('.')}"`);
        }
      } else if ('validate' == type) {
        if (m.appLib.appModelHelpers.Validators[handler.validator]) {
          //try {
          let boundHandler = m.appLib.appModelHelpers.Validators[handler.validator].bind(data);
          process.nextTick(function () {
            boundHandler(modelName, lodashPath, appModelPart, userContext, handler, (err) => {
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
      let head = path.slice(0, 1)[0];
      let changesHead = changesPath.length > 0 ? changesPath.slice(0, 1)[0] : false;
      if (head == "fields") {
        if (appModelPart.type == "Array" || appModelPart.type == "Subschema") {
          //log.trace( `>>>> Preparing to iterate head: ${head} lodashPath: ${lodashPath} changesHead: ${changesHead} type: ${appModelPart.type} data: ${JSON.stringify(data)}` );
          async.eachOfSeries(lodashPath == "" ? data : _.get(data, lodashPath), (el, idx, cb) => {
            //log.trace( `>>>> Iterating head: ${head} lodashPath: ${lodashPath} idx: ${idx} changesHead: ${changesHead} el._id: ${el._id}` );
            if (!changesHead || (el._id + "") == changesHead) { // changesHead narrows array iteration to just specific ID
              m.traverseDocAndCallProcessor(type, modelName, userContext, handler, appModelPart[head], data, `${lodashPath}.${idx}`, path.slice(1), changesPath.slice(1), cb);
            } else {
              cb();
            }
          }, cb);
        } else if (appModelPart.type == "Schema") {
          m.traverseDocAndCallProcessor(type, modelName, userContext, handler, appModelPart[head], data, lodashPath, path.slice(1), changesPath.slice(1), cb);
        } else if (appModelPart.type == "Object") {
          m.traverseDocAndCallProcessor(type, modelName, userContext, handler, appModelPart[head], data, lodashPath, path.slice(1), changesPath.slice(1), cb);
        } else {
          let error = `Inconsistent App Model path ${path.join('.')} at data path ${lodashPath}`;
          log.error(error);
          cb(error);
        }
      } else {
        m.traverseDocAndCallProcessor(type, modelName, userContext, handler, appModelPart[head], data, `${lodashPath}.${head}`, path.slice(1), changesPath.slice(1), cb);
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
    let traverseAppModelPart = (part, key, path, cb) => {
      async.series([
        (cb) => {
          //log.trace( `A:${part} R:${root} P:${path} K:${key}` );
          if ('fields' == key) {
            async.eachOfSeries(part, (val, key, cb) => {
              traverseAppModelParts(val, _.concat(path, key), cb);
            }, cb);
          } else {
            cb();
          }
        },
        (cb) => {
          processor(part, key, path, cb);
        }
      ], cb);
    };

    let traverseAppModelParts = (parts, path, cb) => {
      async.eachOfSeries(parts, (val, key, cb) => {
        traverseAppModelPart(val, key, _.concat(path, key), cb);
      }, cb);
    };

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
  m.processAppModel = function (attributes, modelName, changesPath, processor, cb) {
    if (m.appLib.appModel.models[modelName]) {
      let appModelPath = _([modelName]).concat(changesPath).map((val, key) => {
        return ((key < 1) || (key % 2 == 0)) ? val : 'fields'
      }).value(); // removes _id parts from the changesPath
      //log.trace( `processAppModel attributes: "${attributes}" model: "${modelName}" appModelPath: ${appModelPath} changesPath: "${changesPath}"` );
      if ('fields' == appModelPath[appModelPath.length - 1]) {
        appModelPath = appModelPath.slice(0, appModelPath.length - 1);
      }
      m.traverseAppModel(_.get(m.appLib.appModel.models, appModelPath.join('.')), appModelPath, (val, key, path, cb) => {
        if (_.includes(attributes, key)) {
          // conversion to array is already done in model.js@validateModelPart
          //if ('string' == typeof val) {
          //    val = [val];
          //}
          //if (Array.isArray(val)) {

          Promise.mapSeries(val, (functionName) => {
            return processor(key, functionName, val, path);
          })
            .then(() => cb())
            .catch((err) => cb(err));

          //} else {
          //    cb(`Invalid handler specification, must be an array in ${_.concat(path, key).join('.')}`);
          //}
        } else {
          cb();
        }
      }, (err) => {
        if (err) {
          cb(err);
        } else {
          cb();
        }
      });
    } else {
      cb(`Model '${modelName}' was not found for validation and transformation purposes`);
    }
  };

  m.processAppModelPromisified = Promise.promisify(m.processAppModel);

// TODO: make sure PUT is updating records via record.save, not collection.update
// TODO: validate parts of appModel that are not explicitly defined as validation, e.g. "required" and similar
// TODO: call post transformers on 'post' middleware
  /**
   * Runs Transformations on data before saving data to the database.
   * This method is called as mongoose 'document pre', it traverses the entire model definition and calls
   * transformation methods as specified in the app model
   * WARNING: do not use lambda (=>) function for this function, always use "function() {}" syntax in order to establish "this"
   * WARNING: this also calls synthesizers
   * @param model mongoose model the
   * @param data the data to traverse. This method may need traverse only part of the document data specified by changesPath
   * @param changesPath - the part of the doc where the changes occured represented as an array. Example: [58ed793cd78de0745f84e2dd,encounters,3550cf00d207fe624eaaa918,vitalSigns,e44c93b0e80f393af37367eb]. This path is a mix of appModel path and data path. Note that transformation will be done for the whole data, but validation will be performed only for the changed part.
   * @param next
   */
  m.preSaveTransformData = function (modelName, userContext, data, changesPath) {
    //log.trace(`preSaveTransformData model ${modelName} changesPath: ${changesPath} data: ${JSON.stringify(data)}`);
    let errors = [];

    return processAttribute("validate", changesPath)
      .catch((err) => errors.push(err))
      .then(() => {
          return processAttribute("transform", []);
        })
      .then(() => {
        return processAttribute("synthesize", []);
      })
      .then(() => {
        if (errors.length > 0) {
          throw new Error(errors.join("\n"));
        }
      });

    function processAttribute (attribute, changesPath) {
      return m.processAppModelPromisified([attribute], modelName, changesPath, function (type, handler, val, path) {
        let name = Array.isArray(handler) ? handler[0] : handler;
        if (name && name != "null") {
          // NOTE: first element is always the model name, the last one is "transform
          // NOTE: It's up to traverseDocAndCallProcessor method to narrow down the validation to specific element of the subschema array
          // Model traversing can't filter this part.
          return m.traverseDocAndCallProcessorPromisified(type, modelName, userContext, name, m.appLib.appModel.models[path[0]], data, "", path.slice(1, path.length - 1), changesPath);
        } else {
          return Promise.resolve();
        }
      });
    }
  };

  /**
   * Recursively removes all soft deleted elements from array of elements by its model.
   * First invocation is made with params for root schema.
   * @param model subschema model
   * @param arrData subschema elements
   */
  m.removeSoftDeletedSubschemaElements = function removeSoftDeletedSubschemaElements(model, arrData) {
    const modelFields = _.get(model, 'fields', {});
    const innerSubschemaFields = _.pickBy(modelFields, (value, key) => value.type === 'Subschema');
    const innerSubschemaFieldNames = _.keys(innerSubschemaFields);

    for (let [idx, data] of arrData.entries()) {
      if (_.get(data, 'deletedAt')) {
        arrData.splice(idx, 1);
        continue;
      }

      for (let innerSubschemaFieldName of innerSubschemaFieldNames) {
        const elems = data[innerSubschemaFieldName] || [];
        const innerModel = _.get(model, ['fields', innerSubschemaFieldName], {});
        if (!_.isEmpty(elems)) {
          removeSoftDeletedSubschemaElements(innerModel, elems);
        }
      }
    }
  };

  /**
   * Runs Transformations on data after retrieving data from the database
   * WARNING: do not use lambda (=>) function for this function, always use "function() {}" syntax in order to establish "this"
   * @param data the data (regular object) to run post-processing for. Post-=processing always runs for the entire document data
   */
  // TODO: handle errors if any
  m.postInitTransformData = function (modelName, userContext, data) {
    //log.trace(`postInitTransformData model ${modelName} data: ${JSON.stringify(data)}`);
    return m.processAppModelPromisified(["transform"], modelName, [], function (type, handler, val, path) {
      if (Array.isArray(handler) && handler.length > 1) {
        let name = handler[1];
        if (name && name != "null") {
          return m.traverseDocAndCallProcessorPromisified(type, modelName, userContext, name, m.appLib.appModel.models[path[0]], data, "", path.slice(1, path.length - 1), []); // first element is always the model name, the last one is "transform
        }
      }
      return Promise.resolve();
    });
  };

  return m;
};
