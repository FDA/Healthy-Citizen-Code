/**
 * Implements default processing for all data specified in the appModel
 * You can override default behavior with "controller" schema property (see the metaschema)
 * @returns {{}}
 */
module.exports = function () {
    const fs = require('fs-extra');
    const _ = require("lodash");
    const log = require('log4js').getLogger('lib/default-controller');
    const mongoose = require('mongoose');
    const dba = require('./database-abstraction')();
    const ObjectID = require('mongodb').ObjectID;
    const butil = require('./backend-util')();
    butil.loadLists();
    const async = require('async');
    const uglify = require("uglify-js");

    let m = {};

    /**
     * Sends error message with 400 HTTP code and returns next() (to make sure that the restify after callbacks fire)
     * message is the error message to return to the client
     * @param req
     * @param res
     * @param next
     * @param message
     * @returns {*}
     */
    m.error = (req, res, next, message) => {
        log.error(`URL: ${req.url}, ${message}`);
        res.json(400, {success: false, message: message});
        return next();
    };

    /**
     * Returns status message indicating that the backend is up and running
     * Good for uptimerobot to verify the status
     * @param req
     * @param res
     * @param next
     */
    m.getRootJson = (req, res, next) => {
        res.json({success: true, message: `HC Backend V3 is working correctly`});
        next();
    };

    /**
     * Returns JSON containing the appModel metaschema
     * @param req
     * @param res
     * @param next
     */
    m.getMetaschemaJson = (req, res, next) => {
        res.json({success: true, data: appModel.metaschema});
        next();
    };

    /**
     * Returns JSON containing all schemas in the app model
     * @param req
     * @param res
     * @param next
     */
    m.getSchemasJson = (req, res, next) => {
        res.json({success: true, data: appModel.models});
        next();
    };

    /**
     * Returns JSON containing full application model
     * @param req
     * @param res
     * @param next
     */
    m.getAppModelJson = (req, res, next) => {
        res.json({success: true, data: appModel});
        next();
    };

    /**
     * Returns JSON containing definition of a specific dashboard
     * @param req
     * @param res
     * @param next
     */
    m.getDashboardJson = (req, res, next) => {
        res.json({success: true, data: _.get(appModel, `interface.${req.params.id}`, {})});
        next();
    };

    /**
     * returns lists used both on front and backend as JSON
     * @param req
     * @param res
     * @param next
     */
    m.getListsJson = (req, res, next) => {
        res.json({success: true, data: appModelHelpers.Lists});
        next();
    };

    m.getTypeDefaults = (req, res, next) => {
        res.json({success: true, data: appModel.typeDefaults});
        next();
    };

    /**
     * Returns the interface definition (including sidebars, menus, dashboards etc)
     * @param req
     * @param res
     * @param next
     */
    m.getInterfaceJson = (req, res, next) => {
        res.json({success: true, data: appModel.hasOwnProperty('interface') ? appModel['interface'] : {}});
        next();
    };

    /**
     * Returns the interface definition (including sidebars, menus, dashboards etc)
     * @param req
     * @param res
     * @param next
     */
    m.getDashboardSubtypesJson = (req, res, next) => {
        res.json({success: true, data: _.get( appModel, 'interface.dashboardSubtypes', {})});
        next();
    };

    /**
     * This method requires authentication, so it will only return status: true if the user is authenticated
     * @param req
     * @param res
     * @param next
     */
    m.getIsAuthenticated = (req, res, next) => {
        res.json({success: true, data: "This token is valid"});
        next();
    };

    /**
     * Returns RFC 2324 HTTP code 418
     * @param req
     * @param res
     * @param next
     */
    m.sendTeapot = (req, res, next) => {
        res.send(418, "The requested entity body is short and stout. Tip me over and pour me out.");
        next();
    };

    /**
     * Returns JSON containing schema for specific schema or subschema
     * The path to schema/subschema is figured out from req.url. For instance /schema/phi/encounters/diagnoses
     * returns schema for phi.encounters.diagnosis
     * @param req
     * @param res
     * @param next
     */
    m.getSchema = (req, res, next) => {
        let path = req.url.replace(/^\/schema\//, "").replace(/.json$/, "").split("/");
        let ret = _.get(appModel.models, path.join('.fields.'));
        if (ret && _.indexOf(["Schema", "Subschema"], ret.type) >= 0) {
            // TODO: check why code 200 is not returned by default, getting 426 without explicit specification
            res.json(200, {success: true, data: ret});
        } else {
            res.json(400, {success: false, message: "This schema or subschema doesn't exist"});
        }
        next();
    };

    /**
     * Returns true if the backend is running in development mode (set it in .env file)
     * Good for chaining in the routes setup
     * @param req
     * @param res
     * @param next
     * @returns {*}
     */
    m.isDevelopmentMode = (req, res, next) => {
        if ('true' == process.env.DEVELOPMENT) {
            return next();
        } else {
            res.json(403, {success: false, message: "This route is only available in development mode"});
        }
    };

    /**
     * Utility method returning all searchable fields in a given collection based on appModel definition
     * TODO: extract utility method like this one into a separate file?
     * @param tableName the name of the table to find searchable fields in
     */
    m.getSearchableFields = (tableName) => {
        return _(global.appModel.models[tableName].fields).map((val, key) => {
            return val.searchable ? key : false
        }).compact().value();
    };

    /**
     * Utility method returning mongodb-compatible query for full-text search in given fields
     * @param searchConditions the query to update with the search terms
     * @param fields the list of fields
     * @param term the term to search for
     */
    m.updateSearchConditions = (searchConditions, fields, term) => {
        fields.forEach((field) => {
            let condition = {};
            condition[field] = new RegExp(`${term || ''}.*`, 'i');
            searchConditions.push(condition);
        });
    };

    /**
     * This method returns limited number of entries from a lookup table that match search criteria.
     * It is to be used by UI elements similar to select2 to find appropriate records to display
     * The limit of returned record is defined per schema, see limitReturnedRecords in metaschema
     * The lookup URL should look like /lookup/<table name/<lookup id>.json?q=<lookup string>&page=<page number>
     * Page Number refers to select2 infinity window approach and returns specified batch of limitReturnedRecords records
     * TODO: possibly eventually unify it with the CRUD methods using getElement/getQueryParams/filterArray. Especially if lookup in subschemas will need to be supported
     * @param req
     * @param res
     * @param next
     */
    m.getLookupTableJson = (req, res, next) => {
        let urlParts = butil.getUrlParts(req);
        let lookupId = _.get(urlParts, urlParts.length - 1);
        if (!lookupId) {
            return m.error(req, res, next, "No lookup ID in the URL:" + req.url);
        }
        let lookup = _.get(appLookups, lookupId);
        if (!lookup) {
            return m.error(req, res, next, "Invalid lookup ID in the URL:" + req.url);
        }
        // TODO: L: if necessary support lookups in nested subschemas later. Don't need this now
        let model = mongoose.model(lookup.table);
        if (!model) {
            return m.error(req, res, next, "Invalid model name in the URL:" + req.url);
        }
        // TODO: should I move limit to lookup definition? Or give one ability to override, make it smaller than the one defined on table?
        let limit = _.get(appModel, `models.${lookup.table}.limitReturnedRecords`, _.get(appModel.metaschema, 'limitReturnedRecords.default', -1)); // note that lookups in subschemas are not supported here yet
        let lookupFields = m.getSearchableFields(lookup.table);
        let searchConditions = [];
        m.updateSearchConditions(searchConditions, lookupFields, req.params.q);
        let lookupQuery = searchConditions.length > 0 ? {$or: searchConditions} : {};
        let skip = req.params.page && parseInt(req.params.page) > 0 ? ( parseInt(req.params.page) - 1 ) * limit : 0;
        let label = _.get(lookup, 'label', "_id");
        let foreignKey = _.get(lookup, 'foreignKey', "_id");
        // TODO: support regexps in lookups (check out git history) ?
        // TODO: call renderer for the label?

        dba.findItems(model, (err, data) => {
            if (err) {
                return m.error(req, res, next, `Unable to return lookup result: ${err}`);
            } else {
                let more = data.length == limit;
                let ret = _.map(data, (row) => {
                    return {
                        id: _.get(row, foreignKey),
                        label: _.get(row, label)
                    }
                });
                res.json({success: true, more: more, data: ret});
                next();
            }
        }, lookupQuery, {}, {}, skip, limit);
    };

    /**
     * Parses HTTP query and retrieves parameters like sorting order, search query, skip, limit and other
     * parameters required by select2, datatables and possibly other components in the future
     * TODO: reuse this in getLookupTableJson if possible
     * @param req
     * @returns {*} {err, urlParts, schemaName, model, conditions, projections, order, skip, limit}
     */
    let getQueryParams = (req) => {
        let mongoConditions = {}, conditions = [], mongoProjections = {}, order = {}, skip, limit;
        let urlParts = butil.getUrlParts(req);
        let schemaName = _.get(urlParts, 0);
        if (!schemaName) {
            return {err: "No schema name"};
        }
        let model = mongoose.model(schemaName);
        if (!model) {
            return {err: "Invalid model name"};
        }
        let pathInAppModel = _(urlParts).filter((val, idx) => !(idx % 2)).join(".fields.");
        limit = _.get(appModel, `models.${pathInAppModel}.limitReturnedRecords`, appModel.metaschema.limitReturnedRecords.default || 0);
        limit = Math.min(limit, req.params.length || limit);
        skip = req.params.start ? parseInt(req.params.start) : 0;
        if (req.params.order && ( req.params.visible_columns || req.params.columns )) {
            // supporting sorting in datatables format
            // it's not quite right way singe maps are not ordered, but this is the best we can do based on just order and visible_columns
            // TODO: refactor schema so that fields are stored in an array, not assoc array
            let shownColumns;
            if (req.params.visible_columns) {
                shownColumns = _(req.params.visible_columns).map((v, k) => {
                    return v == "true" ? k : null
                }).compact().value();
            } else { // using req.params.columns, format used by angular datatables
                shownColumns = _.map(req.params.columns, 'data');
            }
            if (Array.isArray(req.params.order)) {
                _.forEach(req.params.order, (val) => {
                    if (val.column) {
                        order[shownColumns[val.column]] = val.dir == 'asc' ? 1 : -1;
                    } else {
                        return {err: "Incorrect order format (should be an array in datatables format)"};
                    }
                });
            } else {
                return {err: "Incorrect order format (should be an array)"};
            }
        } else {
            // TODO: in the future support less weird formats for sorting
            order = _.get(appModel, `models.${pathInAppModel}.defaultSortBy`, appModel.metaschema.defaultSortBy.default);
        }
        let searchConditions = [];
        if (req.params.search && req.params.search.value || req.params.q) { // search[value] (or q) is supported with or without datatables, just in case
            let searchableFields = m.getSearchableFields(schemaName);
            m.updateSearchConditions(searchConditions, searchableFields, req.params.search.value || req.params.q);
        }
        if (urlParts.length >= 2) {
            let itemId;
            try {
                itemId = new ObjectID(urlParts[1]);
            } catch (e) {
                return {err: "Invalid object id"};
            }
            mongoConditions['_id'] = itemId;
            conditions = searchConditions;
        } else { // i.e. need to apply search to mongo only, not the array
            mongoConditions = searchConditions.length > 0 ? {$or: searchConditions} : {};
        }
        if (urlParts.length >= 3) {
            mongoProjections[urlParts[2]] = 1; // as of 3.4 mongodb doesn't support projection in nested arrays, so only 1st level projection is possible
        }
        return {
            urlParts: urlParts,
            schemaName: schemaName,
            model: model,
            mongoConditions: mongoConditions,
            conditions: conditions,
            mongoProjections: mongoProjections,
            projections: {}, // currently always {}, but still in the interface for the future use (see getElement comments)
            mongoOrder: urlParts.length == 1 ? order : {},
            order: urlParts.length >= 2 ? order : {},
            mongoSkip: urlParts.length == 1 ? skip : 0,
            skip: urlParts.length >= 2 ? skip : 0,
            mongoLimit: urlParts.length == 1 ? limit : 0, // mongo returns all records if limit is 0
            limit: urlParts.length >= 2 ? limit : 0,
        };
    };

    let filterArray = (data, conditions, projections, order = {}, skip = 0, limit = 0) => {
        if (Array.isArray(data)) {
            let pipeline = _(data);
            pipeline = pipeline.filter((el) => {
                return conditions.length == 0 || _.some(conditions, (condition) => {
                        return _.every(condition, (val, key) => {
                            return el.hasOwnProperty(key) && el[key] != "" && el[key].match(val);
                        });
                    });
            });
            if (Object.keys(order).length > 0) {
                pipeline = pipeline.orderBy(_.map(order, (v, k) => k), _.map(order, (v, k) => v > 0 ? 'asc' : 'desc'));
            }
            return pipeline.slice(skip, Math.min((limit || data.length) + skip, data.length)).value();
        } else {
            return data;
        }
    };

    /**
     * Helper method finding the data element according to the URL and calling processor callback
     * to deal with it. Used in all CRUD methods.
     * TODO: keep an eye on mongodb, hopefully they will implement good functions for working with nested arrays, so this function can be simplified
     * The callback processor accepts the following parameters:
     * part - the elment found
     * data - entire collection document
     * parent - parent of the element found
     * parentKey - the key in the parent element the part is associated with. I.e. part == parent[parentKey]
     * model - mongoose model the element was found in
     * conditions - the conditions used to find the element
     * // TODO: combine this with lookup method. They now have the same features and sombining will allow lookups in subschemas
     * The query itself supports the following parameters:
     * order[i][column] and order[i][order] - defines the order of sorting asc or desc for the output result
     * length - how many records to return
     * start - how many records to skip (i.e. from what record to start returning values)
     * search (or q) - return only records matching this search term (search is based on appModel searchable attribute)
     * All these parameters are compatible with datatables (both regular and angular)
     * TODO: add ability to exclude certain parts of the data (like large iHealth datasets) or include only specified parts
     * TODO: should I add limit to lookup definition? Or give one ability to override, make it smaller than the one defined on table?
     * TODO: wait for mongodb to support projection on nested arrays
     *       for now retireve all records that need to be retrieved with all attributes
     *       as of 3.4 mongodb doesn't support projection on nested arrays, hence this mess and waste of memory,
     *       using cursor streaming to reduce the memory consumption
     * @param req
     * @param res
     * @param next
     * @param processor the call back to be called for the element found. Receives the following: err, part, data, parent, parentKey, model, mongoConditions, conditions
     * @param ignoreNonexistant if thue then the processor will be called even if the element doesn't exist, otherwise error 400 will be returned
     * @returns {*}
     */
    let getElement = (req, res, next, processor, ignoreNonexistant = false, runPostprocessing = true) => {
        let params = getQueryParams(req);
        if (params.err) {
            processor(params.err);
        } else {
            dba.findItems(params.model, (err, data) => {
                if (err) {
                    processor(`Unable to find items: ${err}`);
                } else {
                    let parent = null;
                    let parentKey = null;
                    data = params.urlParts.length >= 2 ? data[0] : data;
                    let part = data;
                    let advancePart = (idx) => { // goes deeper into the object and keeps track of the parent
                        parent = part;
                        parentKey = idx;
                        if (part && part[idx]) {
                            part = part[idx];
                        } else {
                            part = false;
                        }
                    };
                    for (let i = 1; i < ~~(( params.urlParts.length + 1 ) / 2); i++) {
                        advancePart(params.urlParts[i * 2]);
                        if (params.urlParts.hasOwnProperty(i * 2 + 1)) {
                            let idx = _.findIndex(part, (o) => {
                                return "" + o._id == params.urlParts[i * 2 + 1]
                            });
                            advancePart(idx);
                        }
                    }
                    if (!part && !ignoreNonexistant) {
                        processor("Unable to find any data of this type");
                    } else {
                        let filteredPart = filterArray(part, params.conditions, params.projections, params.order, params.skip, params.limit);
                        processor(null, filteredPart, data, parent, parentKey, params.model, params.mongoConditions, params.conditions);
                    }
                }
            }, params.mongoConditions, params.mongoProjections, params.mongoOrder, params.mongoSkip, params.mongoLimit, runPostprocessing);
        }
    };

    /**
     * Returns all  records from the given collection. attribute limitReturnedRecords or the schema may reduce the maximum number
     * of records returned from this collection at once. Note that in case of tables that require authentication (see requiresAuthentication)
     * isAuthenticated will prevent from returning unauthorized records, so for such collections this method will return nothing.
     * This supports datatables server-side mode parameters
     * @param req
     * @param res
     * @param next
     * @returns {*}
     */
    m.getItems = (req, res, next) => {
        let queryModel;
        let queryConditions;
        let arrayConditions;
        let elements;
        async.series({
            // get data
            data: (cb) => {
                getElement(req, res, next, (err, part, data, parent, parentKey, model, mongoConditions, conditions) => {
                    queryConditions = mongoConditions;
                    arrayConditions = conditions;
                    queryModel = model;
                    if (parent && parent[parentKey]) {
                        elements = parent[parentKey]; // if elements == null that means that filtered records need to be calculated in mongo query
                    }
                    cb(err, part);
                });
            },
            recordsTotal: (cb) => {
                if (req.params.draw) {
                    if (elements) {
                        cb(null, elements.length);
                    } else {
                        queryModel.count({}, cb);
                    }
                } else {
                    cb(null, 0);
                }
            },
            recordsFiltered: (cb) => {
                if (req.params.draw) {
                    if (elements) {
                        cb(null, filterArray(elements, arrayConditions).length);
                    } else {
                        queryModel.count(queryConditions, cb);
                    }
                } else {
                    cb(null, 0);
                }
            }
        }, (err, results) => {
            if (err) {
                res.json(400, {success: false, message: `Unable to retrieve data: ${err}`});
            } else {
                if (req.params.draw) {
                    res.json({
                        success: true,
                        recordsTotal: results.recordsTotal,
                        recordsFiltered: results.recordsFiltered,
                        data: results.data
                    });
                } else {
                    res.json({success: true, data: results.data});
                }
            }
            next();
        });
    };

    /**
     * CRUD Read (returns one item from a url like /phis/5871906ea7cddad23a26084d/encounters/test1/diagnoses/test3.json
     * @param req
     * @param res
     * @param next
     */
    m.getItem = (req, res, next) => {
        getElement(req, res, next, (err, part) => {
            if (err) {
                return m.error(req, res, next, err);
            } else {
                res.json({success: true, data: part});
                next();
            }
        });
    };

    /**
     * Returns array containing changesPath (not compatible with lodash or appModel since it contains both path and _id for subschema elements)
     * The resulting path does NOT contain the model name
     * @param req
     */
    m.getAppModelPath = (req) => {
        // NOTE: ?params are not removed from the URL, maybe will need to do it later
        return req.url.split('/').slice(2);
    };

    /**
     * CRUD Delete (deletes one item from a url like phis/587179f6ef4807703afd0dfe/encounters/e2/vitalSigns/e2v2.json)
     * See README.md for the sample data
     * @param req
     * @param res
     * @param next
     */
    m.deleteItem = (req, res, next) => {
        getElement(req, res, next, (err, part, data, parent, parentKey, model, mongoConditions) => {
            if (err) {
                return m.error(req, res, next, err);
            } else if (parent == null) { // need to delete whole document
                dba.removeItem(model, mongoConditions, (err) => {
                    if (err) {
                        return m.error(req, res, next, err);
                    } else {
                        res.json({success: true});
                        next();
                    }
                });
            } else {
                if (Array.isArray(part) && part.length == 0) {
                    delete parent[parentKey];
                }
                if (Array.isArray(parent)) {
                    parent.splice(parentKey, 1);
                } else if ('object' == typeof parent) {
                    delete parent[parentKey];
                } else {
                    return m.error(req, res, next, err);
                }
                dba.updateItem('$pull', model, mongoConditions, data, m.getAppModelPath(req), (err) => {
                    if (err) {
                        return m.error(req, res, next, err);
                    } else {
                        res.json({success: true});
                        next();
                    }
                });
            }
        });
    };

    /**
     * CRUD Update (updates one item from a url like /phis/587179f6ef4807703afd0dfe/encounters/e2/vitalSigns/e2v2.json)
     * Specify the new data for the item as req.body.data
     * NOTE: _id is removed from the new data, so it won't override the original one.
     * NOTE: you can put nested data, but it won't be accessible via CRUD, because CRUD is completely generated from the appModel, not the content
     * @param req
     * @param res
     * @param next
     */
    m.putItem = (req, res, next) => {
        if (!req.body.hasOwnProperty('data')) {
            return m.error(req, res, next, "New data is not specified");
        }
        getElement(req, res, next, (err, part, data, parent, parentKey, model, mongoConditions) => {
            delete req.body.data._id; // do not override the original document/part id
            if (err) {
                return m.error(req, res, next, err);
            } else if (parent) { // i.e. only part of the document is being updated
                parent[parentKey] = _.assign(parent[parentKey], req.body.data);
            } else {
                data = _.assign(data, req.body.data);
            }
            let appModelPath = m.getAppModelPath(req);
            dba.updateItem('$set', model, mongoConditions, data, appModelPath, (err) => {
                if (err) {
                    return m.error(req, res, next, err);
                } else {
                    res.json({success: true, id: req.body ? req.body.data._id : req.params.id});
                }
            });
        }, false, false);
    };

    /**
     * CRUD Create (creates one item from a url like /phis/587179f6ef4807703afd0dfe/encounters/e2/vitalSigns/e2v2.json)
     * Specify the data for the new item as req.body.data
     * NOTE: this method doesn't set _id recursively, if you're posting whole subtree please make sure all subtree
     * elements belonging to the appModel have _id set
     * @param req
     * @param res
     * @param next
     */
    m.postItem = (req, res, next) => {
        getElement(req, res, next, (err, part, data, parent, parentKey, model, mongoConditions) => {
            if (err) {
                return m.error(req, res, next, err);
            } else {
                if ('undefined' == typeof part) { // happens when trying to post to a valid element in data which doesn't exist in the document yet
                    parent[parentKey] = [];
                }
                if (false == part && parent && parentKey) { // _presumably_ happens when trying to post to an element in data which doesn't exist in the document yet. TODO: verify that this element is part of app Schema
                    parent[parentKey] = [];
                }
                if (parent == null) { // need to add new collection document
                    dba.createItem(model, req.body.data, (err, item) => {
                        if (err) {
                            return m.error(req, res, next, _.isString(err) ? err : err.message || err);
                        } else {
                            res.json({success: true, id: item._id});
                            next();
                        }
                    });
                } else if ('object' == typeof parent && parentKey !== parseInt(parentKey, 10)) { // adding new element into array/subschema
                    if (req.body.data) {
                        if (parent[parentKey]) {
                            req.body.data._id = m.generateObjectId();
                            parent[parentKey].push(req.body.data);
                            // TODO: refactor, updating the whole record is ineffective, just use $push
                            dba.updateItem('$push', model, mongoConditions, data, [...m.getAppModelPath(req), req.body.data._id + ''], (err) => {
                                if (err) {
                                    return m.error(req, res, next, _.isString(err) ? err : err.message || err);
                                } else {
                                    res.json({success: true, id: req.body.data._id});
                                    next();
                                }
                            });
                        } else {
                            return m.error(req, res, next, `parent[parentKey] doesn't exist. parent: ${JSON.stringify(parent, null, 4)} REQ.BODY.DATA: ${JSON.stringify(req.body.data, null, 4)}`);
                        }
                    } else {
                        return m.error(req, res, next, 'Incorrect request');
                    }
                } else {
                    return m.error(req, res, next, 'Only posting new elements into array or into collection is allowed');
                }
            }
        }, true);
    };

    /**
     * Generates unique ID for an element
     * @param base the seed for the ID. Generated IDs for the same seed are the same
     */
    m.generateObjectId = (base) => new ObjectID(butil.generateId(base));

    /* This returns processed .js files for the client side */

    getJsPrefix = (name) => {
        return "if ('undefined' === typeof _) {_ = require('lodash');}" +
            "if ('undefined' === typeof appModelHelpers) {appModelHelpers = {};};" +
            `if ('undefined' === typeof appModelHelpers['${name}']) {appModelHelpers['${name}'] = {};};appModelHelpers['${name}']={\n`;
    };

    getJsObjectString = (obj) => {
        let items = [];
        for (let i in obj) {
            if ('function' === typeof obj[i]) {
                items.push(`"${i}": ${obj[i].toString()}`);
            } else {
                items.push(`"${i}": ${JSON.stringify(obj[i])}`);
            }
        }
        return items.join(",\n");
    };

    sendJavascript = (res, body, next) => {
        res.writeHead(200, {'Content-Type': 'application/javascript'});
        res.write(body);
        res.end();
        next();
    };

    /**
     * Returns string representing code for the appModelHelpers.Lists
     * TODO: depricate it, all clients should use /lists instead of /lists.js
     */
    m.getClientSideCodeForLists = (req, res, next) => {
        butil.loadLists();
        let body = getJsPrefix('Lists') + getJsObjectString(appModelHelpers.Lists) + '};';
        sendJavascript(res, body, next);
    };

    /**
     * Returns string representing code for the appModelHelpers.Lists
     */
    m.getClientSideCodeForLabelRenderers = (req, res, next) => {
        butil.loadLabelRenderers();
        let body = getJsPrefix('LabelRenderers') + getJsObjectString(appModelHelpers.LabelRenderers) + '};';
        sendJavascript(res, body, next);
    };

    /**
     * Returns string representing code for the appModelHelpers.Lists
     */
    m.getClientSideCodeForValidators = (req, res, next) => {
        butil.loadValidators();
        let body = 'vutil={' + getJsObjectString(appModelHelpers.ValidatorUtils) + '};' +
            getJsPrefix('Validators') +
            getJsObjectString(appModelHelpers.Validators) +
            '};';
        sendJavascript(res, body, next);
    };

    /**
     * Returns string representing all code for the application as a string
     */
    m.getAppModelCodeStr = () => {
        butil.loadLists();
        butil.loadLabelRenderers();
        butil.loadValidators();
        return "" +
            getJsPrefix('Lists') + getJsObjectString(appModelHelpers.Lists) + '};' +
            getJsPrefix('LabelRenderers') + getJsObjectString(appModelHelpers.LabelRenderers) + '};' +
            'vutil={' + getJsObjectString(appModelHelpers.ValidatorUtils) + '};' +
            getJsPrefix('Validators') + getJsObjectString(appModelHelpers.Validators) + '};'
            ;
    };

    /**
     * Returns string representing all code for the application
     */
    m.getAppModelCode = (req, res, next) => {
        sendJavascript(res, uglify.minify(m.getAppModelCodeStr(), {output: {beautify: true}}).code, next);
    };

    /**
     * Returns string representing all code for the application
     */
    m.getMinifiedAppModelCode = (req, res, next) => {
        sendJavascript(res, uglify.minify(m.getAppModelCodeStr()).code, next);
    };

    /**
     * Test method for uploading files, will be replaced with methods specified for each field
     * @param req
     * @param res
     * @param next
     */
    m.postUpload = (req, res, next) => {
        if(req.files) {
            log.trace( `Accepting uploaded files: ${JSON.stringify(req.files,null, 4)}` );
            let receivedFiles = [];
            async.eachOfSeries(req.files, (val, key, cb) => {
                let newdir = `uploads/${Math.random().toString(36).substr(2, 4)}`;
                let res = fs.ensureDirSync(`../${newdir}`); // making sure not too many files in one folder
                console.log(res);
                //let newfile = Math.random().toString(36).substr(1, 11);
                let File = mongoose.model('files');
                let fileRecord;
                let newFilePath;
                let cropped;
                let croppingParameters;
                async.series([
                    (cb) => { // create files record
                        new File({
                            originalName: val.name,
                            size: val.size,
                            mimeType: val.type
                            //user // TODO: later
                        }).save((err, data) => {
                            fileRecord = data;
                            newFilePath = `${newdir}/${fileRecord._id}`;
                            cb(err);
                        });
                    },
                    (cb) => { // move file
                        fs.move(val.path, `../${newFilePath}`, cb);
                    },
                    (cb) => { // update files record with file name
                        File.findByIdAndUpdate(fileRecord._id, {filePath: newFilePath}, cb);
                    },
                    (cb) => { // remember the file data
                        const doc = fileRecord._doc;
                        receivedFiles.push({
                            id: fileRecord._id,
                            type: doc.mimeType,
                            name: doc.originalName,
                            size: doc.size,
                        });
                        cb();
                    }
                ], cb);
            }, (err) => {
                if(err) {
                    log.error(`Error while uploading files: ${err}`);
                    res.json({success: false, message: 'Error occured while uploading files'});
                } else {
                    res.json({success: true, data: receivedFiles});
                }
                next();
            });
        } else {
            m.error(req, res, next, 'No file data received');
        }
    };

    return m;
};