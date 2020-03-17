const request = require('supertest');
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
} = reqlib('test/test-util');

describe('V5 Backend Schema Routes', () => {
  before(async function() {
    this.expected = {
      type: 'Schema',
      schemaName: 'model1s',
      fullName: 'model1s',
      limitReturnedRecords: 1,
      defaultSortBy: {
        _id: -1,
      },
      parameters: {
        enableInCellEditing: false,
        allowColumnReordering: true,
        allowColumnResizing: true,
        filterRow: {
          visible: true,
        },
        columnChooser: {
          enabled: true,
          allowSearch: true,
          mode: 'select',
        },
        columnFixing: {
          enabled: true,
        },
        stateStoring: {
          enabled: true,
          type: 'localStorage',
          storageKey: 'storage',
        },
        sorting: {
          mode: 'multiple',
        },
        pager: {
          showPageSizeSelector: true,
          allowedPageSizes: [10, 15, 20],
        },
        paging: {
          pageSize: 10,
        },
        groupPanel: {
          visible: true,
        },
        export: {
          enabled: true,
        },
        import: {
          enabled: true,
        },
        selection: {
          mode: 'single',
          selectAllMode: 'page',
        },
        columnResizingMode: 'widget',
        columnHidingEnabled: true,
        hoverStateEnabled: true,
        loadInvisibleFields: true,
      },
      fields: {
        string: {
          parameters: {
            enableInCellEditing: true,
            grouping: {
              allowGrouping: true,
              allowExpandGroup: true,
            },
            minWidth: 100,
          },
          fieldName: 'string',
          filter: 'string',
          type: 'String',
          fullName: 'String',
          responsivePriority: 100,
          showInViewDetails: true,
          showInDatatable: true,
          showInForm: true,
          showInGraphql: true,
          fieldInfo: {
            read: true,
            write: true,
          },
          width: 100,
          searchable: true,
          autocomplete: 'enable',
        },
        encounters: {
          fieldName: 'encounters',
          parameters: {
            grouping: {
              allowGrouping: false,
            },
          },
          type: 'Array',
          filter: 'none',
          fullName: 'Encounters Full Name',
          description: 'Encounters Description',
          responsivePriority: 100,
          width: 200,
          showInViewDetails: true,
          showInDatatable: true,
          showInForm: true,
          showInGraphql: true,
          fieldInfo: {
            read: true,
            write: true,
          },
          fields: {
            diagnoses: {
              fieldName: 'diagnoses',
              parameters: {
                grouping: {
                  allowGrouping: false,
                },
              },
              type: 'Array',
              filter: 'none',
              fullName: 'Diagnoses Full Name',
              description: 'Diagnoses Description',
              fieldInfo: {
                read: true,
                write: true,
              },
              showInViewDetails: true,
              showInDatatable: true,
              showInForm: true,
              showInGraphql: true,
              fields: {
                data: {
                  parameters: {
                    enableInCellEditing: true,
                    grouping: {
                      allowGrouping: true,
                      allowExpandGroup: true,
                    },
                    minWidth: 100,
                  },
                  type: 'String',
                  filter: 'string',
                  fieldName: 'data',
                  fullName: 'Data Full Name',
                  description: 'Data Description',
                  width: 100,
                  searchable: true,
                  responsivePriority: 100,
                  showInViewDetails: true,
                  showInDatatable: true,
                  showInForm: true,
                  showInGraphql: true,
                  fieldInfo: {
                    read: true,
                    write: true,
                  },
                  autocomplete: 'enable',
                },
              },
              responsivePriority: 100,
              width: 200,
            },
            vitalSigns: {
              type: 'Array',
              parameters: {
                grouping: {
                  allowGrouping: false,
                },
              },
              fieldName: 'vitalSigns',
              filter: 'none',
              fullName: 'Vital Signs Full Name',
              description: 'Vital Signs Description',
              fieldInfo: {
                read: true,
                write: true,
              },
              showInViewDetails: true,
              showInDatatable: true,
              showInForm: true,
              showInGraphql: true,
              fields: {
                data: {
                  parameters: {
                    enableInCellEditing: true,
                    grouping: {
                      allowGrouping: true,
                      allowExpandGroup: true,
                    },
                    minWidth: 100,
                  },
                  type: 'String',
                  filter: 'string',
                  fieldName: 'data',
                  fullName: 'Data Full Name',
                  description: 'Data Description',
                  width: 100,
                  searchable: true,
                  responsivePriority: 100,
                  fieldInfo: {
                    read: true,
                    write: true,
                  },
                  showInViewDetails: true,
                  showInDatatable: true,
                  showInForm: true,
                  showInGraphql: true,
                  autocomplete: 'enable',
                },
                array: {
                  parameters: {
                    enableInCellEditing: true,
                    grouping: {
                      allowGrouping: true,
                      allowExpandGroup: true,
                    },
                  },
                  type: 'String[]',
                  filter: 'stringMultiple',
                  fieldName: 'array',
                  fullName: 'Array',
                  description: 'Array',
                  responsivePriority: 100,
                  width: 150,
                  fieldInfo: {
                    read: true,
                    write: true,
                  },
                  showInViewDetails: true,
                  showInDatatable: true,
                  showInForm: true,
                  showInGraphql: true,
                  autocomplete: 'enable',
                },
              },
              responsivePriority: 100,
              width: 200,
            },
          },
        },
        creator: {
          type: 'LookupObjectID',
          lookup: {
            id: 'Model1sCreator',
            table: {
              users: {
                foreignKey: '_id',
                label: 'this.login',
                table: 'users',
              },
            },
          },
          fullName: 'creator',
          filter: 'lookupObjectId',
          autocomplete: 'enable',
          fieldName: 'creator',
          showInViewDetails: false,
          showInDatatable: false,
          showInForm: false,
          showInGraphql: false,
          description: 'Record Creator',
          width: 150,
          responsivePriority: 100,
          fieldInfo: {
            read: true,
            write: true,
          },
          parameters: {
            enableInCellEditing: true,
          },
        },
        createdAt: {
          fieldName: 'createdAt',
          type: 'Date',
          filter: 'date',
          fullName: 'createdAt',
          showInViewDetails: false,
          showInDatatable: false,
          showInForm: false,
          showInGraphql: false,
          description: 'Record Created At',
          width: 150,
          responsivePriority: 100,
          fieldInfo: {
            read: true,
            write: true,
          },
          index: true,
        },
        updatedAt: {
          fieldName: 'updatedAt',
          type: 'Date',
          filter: 'date',
          fullName: 'updatedAt',
          showInViewDetails: false,
          showInDatatable: false,
          showInForm: false,
          showInGraphql: false,
          description: 'Record Updated At',
          width: 150,
          responsivePriority: 100,
          fieldInfo: {
            read: true,
            write: true,
          },
          index: true,
        },
        deletedAt: {
          fieldName: 'deletedAt',
          default: '1970-01-01T00:00:00.000Z',
          type: 'Date',
          filter: 'date',
          fullName: 'deletedAt',
          showInViewDetails: false,
          showInDatatable: false,
          showInForm: false,
          showInGraphql: false,
          description: 'Record Deleted At',
          width: 150,
          responsivePriority: 100,
          fieldInfo: {
            read: true,
            write: true,
          },
          index: true,
        },
        _id: {
          type: 'ObjectID',
          fullName: 'Id',
          parameters: {
            enableInCellEditing: false,
            visible: false,
            grouping: {
              allowGrouping: false,
              allowExpandGroup: false,
            },
          },
          fieldName: '_id',
          width: 120,
          responsivePriority: 100,
          showInDatatable: true,
          showInViewDetails: true,
          showInForm: true,
          showInGraphql: true,
          filter: 'objectId',
          fieldInfo: { read: true, write: true },
        },
      },
      actions: {
        width: 160,
        responsivePriority: -1,
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
            description: 'Create record',
            backgroundColor: '#2196F3',
            borderColor: '#0c7cd5',
            textColor: 'white',
            showInTable: false,
            action: {
              type: 'action',
              link: 'create',
            },
          },
          upsert: {
            showInTable: false,
          },
        },
      },
    };
    this.batchNumberField = {
      generatorBatchName: {
        type: 'String',
        showInViewDetails: false,
        showInDatatable: false,
        showInForm: false,
        showInGraphql: false,
        // "comment": "Do not set this to anything for real records, they may get wiped out as autogenerated otherwise",
        generated: true,
        fullName: 'Generator Batch Name',
        description: 'Set to the ID of generator batch for synthetic records',
        fieldInfo: {
          read: true,
          write: true,
        },
      },
    };

    prepareEnv();
    this.appLib = reqlib('/lib/app')();
    this.db = await getMongoConnection();
  });

  after(async function() {
    await this.db.dropDatabase();
    await this.db.close();
  });

  afterEach(function() {
    return this.appLib.shutdown();
  });

  beforeEach(async function() {
    await Promise.all([
      this.db.collection('users').deleteMany({}),
      this.db.collection('mongoMigrateChangeLog').deleteMany({}),
    ]);
    await Promise.all([this.db.collection('users').insertOne(admin)]);
  });

  it('responds with correct schema for the model when enablePermissions=false', async function() {
    setAppAuthOptions(this.appLib, {
      requireAuthentication: true,
      enablePermissions: false,
    });
    await this.appLib.setup();
    const additionalData = { fields: this.batchNumberField };
    this.expectedData = _.merge({}, this.expected, additionalData);
    const token = await loginWithUser(this.appLib, admin);
    const res = await request(this.appLib.app)
      .get('/schema/model1s')
      .set('Accept', 'application/json')
      .set('Authorization', `JWT ${token}`)
      .expect('Content-Type', /json/);
    res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
    res.body.success.should.equal(true, res.body.message);
    assert(
      _.isEqual(res.body.data, this.expectedData),
      `Diff: ${JSON.stringify(diffObjects(this.expectedData, res.body.data), null, 2)}`
    );
  });

  it('responds with correct schema for the model when enablePermissions=true', async function() {
    setAppAuthOptions(this.appLib, {
      requireAuthentication: true,
      enablePermissions: true,
    });
    await this.appLib.setup();
    const additionalData = { fields: this.batchNumberField };
    this.expectedData = _.merge({}, this.expected, additionalData);
    const token = await loginWithUser(this.appLib, admin);
    const res = await request(this.appLib.app)
      .get('/schema/model1s')
      .set('Accept', 'application/json')
      .set('Authorization', `JWT ${token}`)
      .expect('Content-Type', /json/);
    res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
    res.body.success.should.equal(true, res.body.message);
    assert(
      _.isEqual(res.body.data, this.expectedData),
      `Diff: ${JSON.stringify(diffObjects(this.expectedData, res.body.data), null, 2)}`
    );
  });
});
