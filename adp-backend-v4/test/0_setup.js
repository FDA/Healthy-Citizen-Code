// NOTE: Passing arrow functions (“lambdas”) to Mocha is discouraged (http://mochajs.org/#asynchronous-code)
// trying to initialize appLib.setup twice causes weird effects. Seems like mongoose is totally not ready for
// using multiple databases using default connect (connections interface could be still good)

/** Other test cases:
 * Check that routes are not available in non-development mode
 * Test /interface endpoint
 * Test that comments are removed from /schema
 * Test storing objects
 * CRUD sending wrong data
 * test the actual HC model to make sure it's not broken
 * in lookups test ref populate
 * test arrays in the model
 * move background jobs and generator from CorpUtil to backend and test those too
 */

/*
 * Test models:
 * model1, model2 - testing basic functionality
 * model3, model4 - testing lookups
 * model5 - testing datatables server side
 */

const dotenv = require('dotenv').load({path: '.env'});
global._ = require('lodash');
global.mongoose = require('mongoose');
global.async = require('async');
global.appLib = require('../lib/app')();
global.mutil = require('../lib/model')();
global.ObjectID = require('mongodb').ObjectID;
global.assert = require('assert');
global.request = require('supertest');
global.should = require('should');
global.id = require('pow-mongodb-fixtures').createObjectId;
global.mainController = require("../lib/default-controller")();

global.diffObjects = function(a, b) {

    var result = {
        different: [],
        missing_from_first: [],
        missing_from_second: []
    };

    _.reduce(a, function (result, value, key) {
        if (b.hasOwnProperty(key)) {
            if (_.isEqual(value, b[key])) {
                return result;
            } else {
                if (typeof (a[key]) != typeof ({}) || typeof (b[key]) != typeof ({})) {
                    //dead end.
                    result.different.push(key);
                    return result;
                } else {
                    var deeper = diffObjects(a[key], b[key]);
                    result.different = result.different.concat(_.map(deeper.different, (sub_path) => {
                        return key + "." + sub_path;
                    }));

                    result.missing_from_second = result.missing_from_second.concat(_.map(deeper.missing_from_second, (sub_path) => {
                        return key + "." + sub_path;
                    }));

                    result.missing_from_first = result.missing_from_first.concat(_.map(deeper.missing_from_first, (sub_path) => {
                        return key + "." + sub_path;
                    }));
                    return result;
                }
            }
        } else {
            result.missing_from_second.push(key);
            return result;
        }
    }, result);

    _.reduce(b, function (result, value, key) {
        if (a.hasOwnProperty(key)) {
            return result;
        } else {
            result.missing_from_first.push(key);
            return result;
        }
    }, result);

    return result;
};

/**
 * Converts all ObjectIDs in the object into strings and does that recursively
 * @param obj
 */
global.fixObjectId = (obj) => {
    _.forOwn(obj, (val, key) => {
        if ('_id' == key) {
            obj[key] += "";
        } else if ('object' == typeof val) {
            fixObjectId(val);
        }
    });
};

global.deleteObjectId = (obj) => {
    _.forOwn(obj, (val, key) => {
        if ('_id' == key) {
            delete obj[key];
        } else if ('object' == typeof val) {
            deleteObjectId(val);
        }
    });
};

global.sampleData1 = {
    "_id": ObjectID("587179f6ef4807703afd0dfe"),
    "encounters": [
        {
            "_id": mainController.generateObjectId("s1e1"),
            "diagnoses": [
                {
                    "_id": mainController.generateObjectId("s1e1d1"),
                    "data": "s1data_e1d1"
                }
            ],
            "vitalSigns": [
                {
                    "_id": mainController.generateObjectId("s1e1v1"),
                    "data": "s1data_e1v1"
                }
            ]
        },
        {
            "_id": mainController.generateObjectId("s1e2"),
            "diagnoses": [
                {
                    "_id": mainController.generateObjectId("s1e2d1"),
                    "data": "s1data_e2d1"
                }
            ],
            "vitalSigns": [
                {
                    "_id": mainController.generateObjectId("s1e2v1"),
                    "data": "s1data_e2v1"
                },
                {
                    "_id": mainController.generateObjectId("s1e2v2"),
                    "data": "s1data_e2v2"
                }
            ]
        }
    ]
};
global.sampleDataToCompare1 = _.cloneDeep(sampleData1);
fixObjectId(sampleDataToCompare1);

global.sampleData2 = { // note the reversed sorting order because the model has default sorting
    "_id": ObjectID("587179f6ef4807703afd0dff"),
    "encounters": [
        {
            "_id": mainController.generateObjectId("s2e3"),
            "vitalSigns": [],
            "diagnoses": []
        },
        {
            "_id": mainController.generateObjectId("s2e2"),
            "diagnoses": [
                {
                    "_id": mainController.generateObjectId("s2e2d1"),
                    "data": "s2data_e2d1"
                }
            ],
            "vitalSigns": [
                {
                    "_id": mainController.generateObjectId("s2e2v1"),
                    "data": "s2data_e2v1"
                },
                {
                    "_id": mainController.generateObjectId("s2e2v2"),
                    "data": "s2data_e2v2"
                }
            ]
        },
        {
            "_id": mainController.generateObjectId("s2e1"),
            "diagnoses": [
                {
                    "_id": mainController.generateObjectId("s2e1d1"),
                    "data": "s2data_e1d1"
                }
            ],
            "vitalSigns": [
                {
                    "_id": mainController.generateObjectId("s2e1v1"),
                    "data": "s2data_e1v1"
                }
            ]
        }
    ]
};
global.sampleDataToCompare2 = _.cloneDeep(sampleData2);
fixObjectId(sampleDataToCompare2);

// this data will be used for post, it won't be in the database
global.sampleData0 = {
    "_id": ObjectID("587179f6ef4807703afd0dfd"),
    "encounters": [
        {
            "_id": mainController.generateObjectId("s0e1"),
            "diagnoses": [
                {
                    "_id": mainController.generateObjectId("s0e1d1"),
                    "data": "s0data_e1d1"
                }
            ],
            "vitalSigns": [
                {
                    "_id": mainController.generateObjectId("s0e1v1"),
                    "data": "s0data_e1v1",
                    "array": ["a", "b"]
                }
            ]
        },
        {
            "_id": mainController.generateObjectId("s0e2"),
            "diagnoses": [
                {
                    "_id": mainController.generateObjectId("s0e2d1"),
                    "data": "s0data_e2d1"
                }
            ],
            "vitalSigns": [
                {
                    "_id": mainController.generateObjectId("s0e2v1"),
                    "data": "s0data_e2v1",
                    "array": ["B", "C"]
                },
                {
                    "_id": mainController.generateObjectId("s0e2v2"),
                    "data": "s0data_e2v2",
                    "array": ["1", "2", "3"]
                }
            ]
        }
    ]
};
global.sampleDataToCompare0 = _.cloneDeep(sampleData0);
fixObjectId(sampleDataToCompare0);

// Note that this one is augmented by typeDefaults.json
global.expected = {
    type: "Schema",
    "fullName": "model1s",
    limitReturnedRecords: 1,
    "defaultSortBy": {
        "_id": -1
    },
    "actions": {
        "width": 100,
        responsivePriority: 50,
        fields: {
            "update": {
                backgroundColor: "#4CAF50",
                description: "Update record",
                borderColor: "#388E3C",
                textColor: "white",
                "icon": {
                    "link": "pencil"
                },
                "action": {
                    "type": "action",
                    "link": "update"
                }
            },
            "delete": {
                backgroundColor: "#F44336",
                borderColor: "#f32c1e",
                textColor: "white",
                description: "Delete record",
                "icon": {
                    "link": "trash-o"
                },
                "action": {
                    "type": "action",
                    "link": "delete"
                }
            },
            "clone": {
                backgroundColor: "#4CAF50",
                borderColor: "#388E3C",
                textColor: "white",
                description: "Clone record",
                "icon": {
                    "link": "clone"
                },
                "action": {
                    "type": "action",
                    "link": "clone"
                }
            },
            "viewDetails": {
                backgroundColor: "#2196F3",
                borderColor: "#0c7cd5",
                textColor: "white",
                description: "View record details",
                "icon": {
                    "link": "eye"
                },
                "action": {
                    "type": "action",
                    "link": "viewDetails"
                }
            },
            "view": {
                "showInTable": false
            },
            "create": {
                "showInTable": false
            }
        }
    },
    fields: {
        created: {
            "type": "Date",
            "visible": false,
            "generated": true,
            "fullName": "Updated",
            "description": "Date when the record was last created"
        },
        updated: {
            "type": "Date",
            "visible": false,
            "generated": true,
            "fullName": "Updated",
            "description": "Date when the record was last updated"
        }, deleted: {
            "type": "Date",
            "visible": false,
            "generated": true,
            "fullName": "Deleted",
            "description": "Date when the record was deleted"
        },
        encounters: {
            type: 'Subschema',
            "limitReturnedRecords": 0,
            fullName: 'Encounters Full Name',
            description: 'Encounters Description',
            "defaultSortBy": {
                "_id": -1
            },
            "actions": {
                "width": 100,
                responsivePriority: 50,
                fields: {
                    "update": {
                        backgroundColor: "#4CAF50",
                        borderColor: "#388E3C",
                        textColor: "white",
                        "icon": {
                            "link": "pencil"
                        },
                        "action": {
                            "type": "action",
                            "link": "update"
                        }
                    },
                    "delete": {
                        backgroundColor: "#F44336",
                        borderColor: "#f32c1e",
                        textColor: "white",
                        "icon": {
                            "link": "trash-o"
                        },
                        "action": {
                            "type": "action",
                            "link": "delete"
                        }
                    },
                    "clone": {
                        backgroundColor: "#4CAF50",
                        borderColor: "#388E3C",
                        textColor: "white",
                        "icon": {
                            "link": "clone"
                        },
                        "action": {
                            "type": "action",
                            "link": "clone"
                        }
                    },
                    "viewDetails": {
                        backgroundColor: "#2196F3",
                        borderColor: "#0c7cd5",
                        textColor: "white",
                        "icon": {
                            "link": "eye"
                        },
                        "action": {
                            "type": "action",
                            "link": "viewDetails"
                        }
                    },
                    "view": {
                        "showInTable": false
                    },
                    "create": {
                        "showInTable": false
                    }
                }
            },
            fields: {
                created: {
                    "type": "Date",
                    "visible": false,
                    "generated": true,
                    "fullName": "Updated",
                    "description": "Date when the record was last created"
                },
                updated: {
                    "type": "Date",
                    "visible": false,
                    "generated": true,
                    "fullName": "Updated",
                    "description": "Date when the record was last updated"
                }, deleted: {
                    "type": "Date",
                    "visible": false,
                    "generated": true,
                    "fullName": "Deleted",
                    "description": "Date when the record was deleted"
                },
                _id: {
                    "type": "ObjectID",
                    "visible": false,
                    "generated": true,
                    "fullName": "Subschema element id",
                    "description": "Subschema element id",
                    "generatorSpecification": ["_id()"]
                },
                diagnoses: {
                    type: 'Subschema',
                    "limitReturnedRecords": 0,
                    fullName: 'Diagnoses Full Name',
                    description: 'Diagnoses Description',
                    "defaultSortBy": {
                        "_id": -1
                    },
                    "actions": {
                        "width": 100,
                        responsivePriority: 50,
                        fields: {
                            "update": {
                                backgroundColor: "#4CAF50",
                                borderColor: "#388E3C",
                                textColor: "white",
                                "icon": {
                                    "link": "pencil"
                                },
                                "action": {
                                    "type": "action",
                                    "link": "update"
                                }
                            },
                            "delete": {
                                backgroundColor: "#F44336",
                                borderColor: "#f32c1e",
                                textColor: "white",
                                "icon": {
                                    "link": "trash-o"
                                },
                                "action": {
                                    "type": "action",
                                    "link": "delete"
                                }
                            },
                            "clone": {
                                backgroundColor: "#4CAF50",
                                borderColor: "#388E3C",
                                textColor: "white",
                                "icon": {
                                    "link": "clone"
                                },
                                "action": {
                                    "type": "action",
                                    "link": "clone"
                                }
                            },
                            "viewDetails": {
                                backgroundColor: "#2196F3",
                                borderColor: "#0c7cd5",
                                textColor: "white",
                                "icon": {
                                    "link": "eye"
                                },
                                "action": {
                                    "type": "action",
                                    "link": "viewDetails"
                                }
                            },
                            "view": {
                                "showInTable": false
                            },
                            "create": {
                                "showInTable": false
                            }
                        }
                    },
                    fields: {
                        created: {
                            "type": "Date",
                            "visible": false,
                            "generated": true,
                            "fullName": "Updated",
                            "description": "Date when the record was last created"
                        },
                        updated: {
                            "type": "Date",
                            "visible": false,
                            "generated": true,
                            "fullName": "Updated",
                            "description": "Date when the record was last updated"
                        }, deleted: {
                            "type": "Date",
                            "visible": false,
                            "generated": true,
                            "fullName": "Deleted",
                            "description": "Date when the record was deleted"
                        },
                        _id: {
                            "type": "ObjectID",
                            "visible": false,
                            "generated": true,
                            "fullName": "Subschema element id",
                            "description": "Subschema element id",
                            "generatorSpecification": ["_id()"]
                        },
                        data: {
                            type: 'String',
                            fullName: 'Data Full Name',
                            description: 'Data Description',
                            "width": 150,
                            "visible": true,
                            "visibilityPriority": 100,
                            "responsivePriority": 100,
                            "searchable": true,
                            "transform": [
                                "trim"
                            ]
                        }
                    }
                },
                vitalSigns: {
                    type: 'Subschema',
                    "limitReturnedRecords": 0,
                    fullName: 'Vital Signs Full Name',
                    description: 'Vital Signs Description',
                    "defaultSortBy": {
                        "_id": -1
                    },
                    "actions": {
                        "width": 100,
                        responsivePriority: 50,
                        fields: {
                            "update": {
                                backgroundColor: "#4CAF50",
                                borderColor: "#388E3C",
                                textColor: "white",
                                "icon": {
                                    "link": "pencil"
                                },
                                "action": {
                                    "type": "action",
                                    "link": "update"
                                }
                            },
                            "delete": {
                                backgroundColor: "#F44336",
                                borderColor: "#f32c1e",
                                textColor: "white",
                                "icon": {
                                    "link": "trash-o"
                                },
                                "action": {
                                    "type": "action",
                                    "link": "delete"
                                }
                            },
                            "clone": {
                                backgroundColor: "#4CAF50",
                                borderColor: "#388E3C",
                                textColor: "white",
                                "icon": {
                                    "link": "clone"
                                },
                                "action": {
                                    "type": "action",
                                    "link": "clone"
                                }
                            },
                            "viewDetails": {
                                backgroundColor: "#2196F3",
                                borderColor: "#0c7cd5",
                                textColor: "white",
                                "icon": {
                                    "link": "eye"
                                },
                                "action": {
                                    "type": "action",
                                    "link": "viewDetails"
                                }
                            },
                            "view": {
                                "showInTable": false
                            },
                            "create": {
                                "showInTable": false
                            }
                        }
                    },
                    fields: {
                        created: {
                            "type": "Date",
                            "visible": false,
                            "generated": true,
                            "fullName": "Updated",
                            "description": "Date when the record was last created"
                        },
                        updated: {
                            "type": "Date",
                            "visible": false,
                            "generated": true,
                            "fullName": "Updated",
                            "description": "Date when the record was last updated"
                        }, deleted: {
                            "type": "Date",
                            "visible": false,
                            "generated": true,
                            "fullName": "Deleted",
                            "description": "Date when the record was deleted"
                        },
                        _id: {
                            "type": "ObjectID",
                            "visible": false,
                            "generated": true,
                            "fullName": "Subschema element id",
                            "description": "Subschema element id",
                            "generatorSpecification": ["_id()"]
                        },
                        data: {
                            type: 'String',
                            fullName: 'Data Full Name',
                            description: 'Data Description',
                            "visible": true,
                            "visibilityPriority": 100,
                            "responsivePriority": 100,
                            "width": 150,
                            "searchable": true,
                            "transform": [
                                "trim"
                            ]
                        },
                        array: {
                            "type": "String[]",
                            "fullName": "Array",
                            "description": "Array",
                            "visible": true,
                            "visibilityPriority": 100,
                            "responsivePriority": 100,
                            "width": 100
                        }
                    }
                }
            }
        }
    }
};

describe('V3 Backend Tests Setup', () => {
    before(function () {
        process.env.LOG4JS_CONFIG = "./test/log4js.json";
        process.env.MONGODB_URI = process.env.MONGODB_TEST_URI || "mongodb://localhost:27017/adp-integration-test";
        process.env.APP_MODEL_DIR = "./test/model";
        process.env.DEVELOPMENT = true;
        return appLib.setup();
    });
    it('connects to the database', function (done) {
        mongoose.connection.readyState.should.equal(1);
        done();
    });
});