const request = require('supertest');
const should = require('should');
const assert = require('assert');
const _ = require('lodash');

const reqlib = require('app-root-path').require;
const testUtil = reqlib('test/backend/test-util');

describe('V5 Backend Schema Routes', () => {
  before(function () {
    this.expected = {
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
        "creator": {
          "type": "ObjectID",
          "fullName": "creator",
          "visible": false,
          "synthesize": [
            "creator"
          ],
          "width": 120,
          "visibilityPriority": 100,
          "responsivePriority": 100,
          "description": "Record Creator"
        },
        "createdAt": {
          "type": "Date",
          "fullName": "createdAt",
          "visible": false,
          "synthesize": [
            "createdAt"
          ],
          "width": 85,
          "visibilityPriority": 100,
          "responsivePriority": 100,
          "description": "Record Created At"
        },
        "updatedAt": {
          "type": "Date",
          "fullName": "updatedAt",
          "visible": false,
          "synthesize": [
            "updatedAt"
          ],
          "width": 85,
          "visibilityPriority": 100,
          "responsivePriority": 100,
          "description": "Record Updated At"
        },
        "deletedAt": {
          "type": "Date",
          "fullName": "deletedAt",
          "visible": false,
          "width": 85,
          "visibilityPriority": 100,
          "responsivePriority": 100,
          "description": "Record Deleted At"
        },
        _temporary: {
          "type": "Boolean",
          "fullName": "_temporary",
          "visible": "false",
          "width": 20,
          "visibilityPriority": 100,
          "responsivePriority": 100,
          "description": "Temporary"
        },
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
        },
        deleted: {
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
            "creator": {
              "type": "ObjectID",
              "fullName": "creator",
              "visible": "false",
              "synthesize": [
                "creator"
              ],
              "width": 120,
              "visibilityPriority": 100,
              "responsivePriority": 100
            },
            "createdAt": {
              "type": "Date",
              "fullName": "createdAt",
              "visible": "false",
              "synthesize": [
                "createdAt"
              ],
              "width": 85,
              "visibilityPriority": 100,
              "responsivePriority": 100
            },
            "updatedAt": {
              "type": "Date",
              "fullName": "updatedAt",
              "visible": "false",
              "synthesize": [
                "updatedAt"
              ],
              "width": 85,
              "visibilityPriority": 100,
              "responsivePriority": 100
            },
            "deletedAt": {
              "type": "Date",
              "fullName": "deletedAt",
              "visible": "false",
              "width": 85,
              "visibilityPriority": 100,
              "responsivePriority": 100
            },
            _temporary: {
              "type": "Boolean",
              "fullName": "_temporary",
              "visible": "false",
              "width": 20,
              "visibilityPriority": 100,
              "responsivePriority": 100
            },
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
            },
            deleted: {
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
                "creator": {
                  "type": "ObjectID",
                  "fullName": "creator",
                  "visible": "false",
                  "synthesize": [
                    "creator"
                  ],
                  "width": 120,
                  "visibilityPriority": 100,
                  "responsivePriority": 100
                },
                "createdAt": {
                  "type": "Date",
                  "fullName": "createdAt",
                  "visible": "false",
                  "synthesize": [
                    "createdAt"
                  ],
                  "width": 85,
                  "visibilityPriority": 100,
                  "responsivePriority": 100
                },
                "updatedAt": {
                  "type": "Date",
                  "fullName": "updatedAt",
                  "visible": "false",
                  "synthesize": [
                    "updatedAt"
                  ],
                  "width": 85,
                  "visibilityPriority": 100,
                  "responsivePriority": 100
                },
                "deletedAt": {
                  "type": "Date",
                  "fullName": "deletedAt",
                  "visible": "false",
                  "width": 85,
                  "visibilityPriority": 100,
                  "responsivePriority": 100
                },
                _temporary: {
                  "type": "Boolean",
                  "fullName": "_temporary",
                  "visible": "false",
                  "width": 20,
                  "visibilityPriority": 100,
                  "responsivePriority": 100
                },
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
                "creator": {
                  "type": "ObjectID",
                  "fullName": "creator",
                  "visible": "false",
                  "synthesize": [
                    "creator"
                  ],
                  "width": 120,
                  "visibilityPriority": 100,
                  "responsivePriority": 100
                },
                "createdAt": {
                  "type": "Date",
                  "fullName": "createdAt",
                  "visible": "false",
                  "synthesize": [
                    "createdAt"
                  ],
                  "width": 85,
                  "visibilityPriority": 100,
                  "responsivePriority": 100
                },
                "updatedAt": {
                  "type": "Date",
                  "fullName": "updatedAt",
                  "visible": "false",
                  "synthesize": [
                    "updatedAt"
                  ],
                  "width": 85,
                  "visibilityPriority": 100,
                  "responsivePriority": 100
                },
                "deletedAt": {
                  "type": "Date",
                  "fullName": "deletedAt",
                  "visible": "false",
                  "width": 85,
                  "visibilityPriority": 100,
                  "responsivePriority": 100
                },
                _temporary: {
                  "type": "Boolean",
                  "fullName": "_temporary",
                  "visible": "false",
                  "width": 20,
                  "visibilityPriority": 100,
                  "responsivePriority": 100
                },
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
    this.batchNumberField = {
      "generatorBatchNumber": {
        "type": "String",
        "visible": false,
        //"comment": "Do not set this to anything for real records, they may get wiped out as autogenerated otherwise",
        "generated": true,
        "fullName": "Generator Batch Number",
        "description": "Set to the ID of generator batch for synthetic records"
      }
    };

    const dotenv = require('dotenv').load({path: './test/backend/.env.test'});
    this.appLib = reqlib('/lib/app')();
    return this.appLib.setup()
      .then(() => {
        const additionalData = { fields: this.batchNumberField };
        _.forEach(this.appLib.accessCfg.DEFAULT_ACTIONS, (action) => {
          _.set(additionalData, `actions.fields.${action}.permissions`, this.appLib.accessCfg.PERMISSIONS.accessAsSuperAdmin);
        });
        this.expectedData = require("merge").recursive(true, this.expected, additionalData);
      });
  });

  after(function () {
    return this.appLib.shutdown();
  });

  it('responds with correct schema for the model', function (done) {
    request(this.appLib.app)
      .get('/schema/model1s')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .end((err, res) => {
        res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
        res.body.success.should.equal(true, res.body.message);
        // TODO: use diffObjects everywhere instead of outputting two lengthy objects
        assert(_.isEqual(res.body.data, this.expectedData), `Diff: ${JSON.stringify(testUtil.diffObjects(this.expectedData, res.body.data), null, 2)}`);
        done();
      });
  });
  it('responds with correct schema for the 2nd level subschema', function (done) {
    request(this.appLib.app)
      .get('/schema/model1s/encounters')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .end((err, res) => {
        res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
        res.body.success.should.equal(true, res.body.message);
        assert(_.isEqual(res.body.data, this.expected.fields.encounters), `Expected:\n${JSON.stringify(this.expectedData.fields.encounters, null, 4)}\nGOT:\n${JSON.stringify(res.body.data, null, 4)}`);
        done();
      });
  });
  it('responds with correct schema for the 3rd level subschema', function (done) {
    request(this.appLib.app)
      .get('/schema/model1s/encounters/diagnoses')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .end((err, res) => {
        res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
        res.body.success.should.equal(true, res.body.message);
        assert(_.isEqual(res.body.data, this.expected.fields.encounters.fields.diagnoses), `Expected:\n${JSON.stringify(this.expectedData.fields.encounters.fields.diagnoses, null, 4)}\nGOT:\n${JSON.stringify(res.body.data, null, 4)}`);
        done();
      });
  });
  it('responds with correct schema for another 3rd level subschema', function (done) {
    request(this.appLib.app)
      .get('/schema/model1s/encounters/vitalSigns')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .end((err, res) => {
        res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
        res.body.success.should.equal(true, res.body.message);
        const diffObjects = testUtil.diffObjects(this.expected.fields.encounters.fields.vitalSigns, res.body.data);
        assert(_.isEqual(res.body.data, this.expected.fields.encounters.fields.vitalSigns), `Expected:\n${JSON.stringify(this.expectedData.fields.encounters.fields.vitalSigns, null, 4)}\nGOT:\n${JSON.stringify(res.body.data, null, 4)}`);
        done();
      });
  });
});
