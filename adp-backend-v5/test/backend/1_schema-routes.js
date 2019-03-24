const request = require('supertest');
const merge = require('merge');
require('should');
const assert = require('assert');
const _ = require('lodash');
const reqlib = require('app-root-path').require;

const {
  diffObjects,
  auth: { admin, loginWithUser },
  getMongoConnection,
  setAppAuthOptions,
  prepareEnv,
} = reqlib('test/backend/test-util');

describe('V5 Backend Schema Routes', () => {
  before(function() {
    this.expected = {
      type: 'Schema',
      fullName: 'model1s',
      limitReturnedRecords: 1,
      defaultSortBy: {
        _id: -1,
      },
      fields: {
        string: {
          type: 'String',
          fullName: 'String',
          visibilityPriority: 100,
          responsivePriority: 100,
          showInViewDetails: true,
          showInDatatable: true,
          showInForm: true,
          showInGraphQL: true,
          fieldInfo: {
            read: true,
            write: true,
          },
          width: 150,
          searchable: true,
          transform: ['trim'],
          autocomplete: 'enable',
        },
        encounters: {
          type: 'Array',
          fullName: 'Encounters Full Name',
          description: 'Encounters Description',
          visibilityPriority: 100,
          responsivePriority: 100,
          width: 100,
          showInViewDetails: true,
          showInDatatable: true,
          showInForm: true,
          showInGraphQL: true,
          fieldInfo: {
            read: true,
            write: true,
          },
          fields: {
            diagnoses: {
              type: 'Array',
              fullName: 'Diagnoses Full Name',
              description: 'Diagnoses Description',
              fieldInfo: {
                read: true,
                write: true,
              },
              showInViewDetails: true,
              showInDatatable: true,
              showInForm: true,
              showInGraphQL: true,
              fields: {
                data: {
                  type: 'String',
                  fullName: 'Data Full Name',
                  description: 'Data Description',
                  width: 150,
                  searchable: true,
                  transform: ['trim'],
                  visibilityPriority: 100,
                  responsivePriority: 100,
                  showInViewDetails: true,
                  showInDatatable: true,
                  showInForm: true,
                  showInGraphQL: true,
                  fieldInfo: {
                    read: true,
                    write: true,
                  },
                  autocomplete: 'enable',
                },
              },
              visibilityPriority: 100,
              responsivePriority: 100,
              width: 100,
            },
            vitalSigns: {
              type: 'Array',
              fullName: 'Vital Signs Full Name',
              description: 'Vital Signs Description',
              fieldInfo: {
                read: true,
                write: true,
              },
              showInViewDetails: true,
              showInDatatable: true,
              showInForm: true,
              showInGraphQL: true,
              fields: {
                data: {
                  type: 'String',
                  fullName: 'Data Full Name',
                  description: 'Data Description',
                  width: 150,
                  searchable: true,
                  transform: ['trim'],
                  visibilityPriority: 100,
                  responsivePriority: 100,
                  fieldInfo: {
                    read: true,
                    write: true,
                  },
                  showInViewDetails: true,
                  showInDatatable: true,
                  showInForm: true,
                  showInGraphQL: true,
                  autocomplete: 'enable',
                },
                array: {
                  type: 'String[]',
                  fullName: 'Array',
                  description: 'Array',
                  visibilityPriority: 100,
                  responsivePriority: 100,
                  width: 100,
                  fieldInfo: {
                    read: true,
                    write: true,
                  },
                  showInViewDetails: true,
                  showInDatatable: true,
                  showInForm: true,
                  showInGraphQL: true,
                  autocomplete: 'enable',
                },
              },
              visibilityPriority: 100,
              responsivePriority: 100,
              width: 100,
            },
          },
        },
        creator: {
          type: 'ObjectID',
          fullName: 'creator',
          showInViewDetails: false,
          showInDatatable: false,
          showInForm: false,
          showInGraphQL: false,
          synthesize: ['creator'],
          description: 'Record Creator',
          width: 120,
          visibilityPriority: 100,
          responsivePriority: 100,
          fieldInfo: {
            read: true,
            write: true,
          },
          index: true,
        },
        createdAt: {
          type: 'Date',
          fullName: 'createdAt',
          showInViewDetails: false,
          showInDatatable: false,
          showInForm: false,
          showInGraphQL: false,
          synthesize: ['createdAt'],
          description: 'Record Created At',
          width: 85,
          visibilityPriority: 100,
          responsivePriority: 100,
          fieldInfo: {
            read: true,
            write: true,
          },
          index: true,
        },
        updatedAt: {
          type: 'Date',
          fullName: 'updatedAt',
          showInViewDetails: false,
          showInDatatable: false,
          showInForm: false,
          showInGraphQL: false,
          synthesize: ['updatedAt'],
          description: 'Record Updated At',
          width: 85,
          visibilityPriority: 100,
          responsivePriority: 100,
          fieldInfo: {
            read: true,
            write: true,
          },
          index: true,
        },
        deletedAt: {
          type: 'Date',
          fullName: 'deletedAt',
          showInViewDetails: false,
          showInDatatable: false,
          showInForm: false,
          showInGraphQL: false,
          description: 'Record Deleted At',
          width: 85,
          visibilityPriority: 100,
          responsivePriority: 100,
          fieldInfo: {
            read: true,
            write: true,
          },
          index: true,
        },
        _temporary: {
          type: 'Boolean',
          fullName: '_temporary',
          showInViewDetails: false,
          showInDatatable: false,
          showInForm: false,
          showInGraphQL: false,
          description: 'Temporary',
          width: 20,
          visibilityPriority: 100,
          responsivePriority: 100,
          fieldInfo: {
            read: true,
            write: true,
          },
          index: true,
        },
      },
      actions: {
        width: 100,
        responsivePriority: 50,
        fields: {
          update: {
            description: 'Update record',
            backgroundColor: '#4CAF50',
            borderColor: '#388E3C',
            textColor: 'white',
            icon: {
              link: 'pencil',
            },
            action: {
              type: 'action',
              link: 'update',
            },
          },
          delete: {
            description: 'Delete record',
            backgroundColor: '#F44336',
            borderColor: '#f32c1e',
            textColor: 'white',
            icon: {
              link: 'trash-o',
            },
            action: {
              type: 'action',
              link: 'delete',
            },
          },
          clone: {
            description: 'Clone record',
            backgroundColor: '#4CAF50',
            borderColor: '#388E3C',
            textColor: 'white',
            icon: {
              link: 'clone',
            },
            action: {
              type: 'action',
              link: 'clone',
            },
          },
          viewDetails: {
            description: 'View record details',
            backgroundColor: '#2196F3',
            borderColor: '#0c7cd5',
            textColor: 'white',
            icon: {
              link: 'eye',
            },
            action: {
              type: 'action',
              link: 'viewDetails',
            },
          },
          view: {
            showInTable: false,
          },
          create: {
            showInTable: false,
          },
        },
      },
    };
    this.batchNumberField = {
      generatorBatchNumber: {
        type: 'String',
        showInViewDetails: false,
        showInDatatable: false,
        showInForm: false,
        showInGraphQL: false,
        // "comment": "Do not set this to anything for real records, they may get wiped out as autogenerated otherwise",
        generated: true,
        fullName: 'Generator Batch Number',
        description: 'Set to the ID of generator batch for synthetic records',
        fieldInfo: {
          read: true,
          write: true,
        },
      },
    };

    prepareEnv();
    this.appLib = reqlib('/lib/app')();
    return getMongoConnection().then(db => {
      this.db = db;
    });
  });

  after(function() {
    return this.db.dropDatabase().then(() => this.db.close());
  });

  afterEach(function() {
    return this.appLib.shutdown();
  });

  beforeEach(function() {
    return Promise.all([
      this.db.collection('users').remove({}),
      this.db.collection('mongoMigrateChangeLog').remove({}),
    ]).then(() => Promise.all([this.db.collection('users').insert(admin)]));
  });

  it('responds with correct schema for the model when enablePermissions=false', function() {
    setAppAuthOptions(this.appLib, {
      requireAuthentication: true,
      enablePermissions: false,
    });
    return this.appLib
      .setup()
      .then(() => {
        const additionalData = { fields: this.batchNumberField };
        this.expectedData = merge.recursive(true, this.expected, additionalData);
      })
      .then(() => loginWithUser(this.appLib, admin))
      .then(token =>
        request(this.appLib.app)
          .get('/schema/model1s')
          .set('Accept', 'application/json')
          .set('Authorization', `JWT ${token}`)
          .expect('Content-Type', /json/)
      )
      .then(res => {
        res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
        res.body.success.should.equal(true, res.body.message);
        // TODO: use diffObjects everywhere instead of outputting two lengthy objects
        assert(
          _.isEqual(res.body.data, this.expectedData),
          `Diff: ${JSON.stringify(diffObjects(this.expectedData, res.body.data), null, 2)}`
        );
      });
  });

  it('responds with correct schema for the model when enablePermissions=true', function() {
    setAppAuthOptions(this.appLib, {
      requireAuthentication: true,
      enablePermissions: true,
    });
    return this.appLib
      .setup()
      .then(() => {
        const additionalData = { fields: this.batchNumberField };
        this.expectedData = merge.recursive(true, this.expected, additionalData);
      })
      .then(() => loginWithUser(this.appLib, admin))
      .then(token =>
        request(this.appLib.app)
          .get('/schema/model1s')
          .set('Accept', 'application/json')
          .set('Authorization', `JWT ${token}`)
          .expect('Content-Type', /json/)
      )
      .then(res => {
        res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
        res.body.success.should.equal(true, res.body.message);
        // TODO: use diffObjects everywhere instead of outputting two lengthy objects
        assert(
          _.isEqual(res.body.data, this.expectedData),
          `Diff: ${JSON.stringify(diffObjects(this.expectedData, res.body.data), null, 2)}`
        );
      });
  });
});
