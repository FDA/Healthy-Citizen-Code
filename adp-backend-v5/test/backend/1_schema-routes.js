require('should');
const assert = require('assert');
const _ = require('lodash');

const {
  diffObjects,
  auth: { admin, loginWithUser },
  getMongoConnection,
  setAppAuthOptions,
  prepareEnv,
  apiRequest,
} = require('../test-util');

describe('V5 Backend Schema Routes', () => {
  before(async function () {
    this.expected = {
      type: 'Schema',
      fullName: 'model1s',
      fields: {
        string: {
          type: 'String',
          fieldName: 'string',
          searchable: true,
          autocomplete: 'enable',
          parameters: {
            renderAsHtml: false,
            enableInCellEditing: true,
            grouping: {
              allowGrouping: true,
              allowExpandGroup: true,
            },
            minWidth: 100,
            allowHeaderFiltering: true,
            headerFilter: {
              allowSearch: true,
            },
            filterType: 'include',
            allowSearch: true,
            maxDatagridCellHeight: 70,
          },
          validate: [
            {
              validator: 'string',
              errorMessages: {
                default: 'Please enter correct String value',
              },
            },
          ],
          fullName: 'String',
          responsivePriority: 100,
          width: 100,
          showInDatatable: true,
          showInViewDetails: true,
          showInForm: true,
          showInGraphql: true,
          filter: 'string',
          fieldInfo: {
            read: true,
            write: true,
          },
          detailedViewOrder: 0,
          datagridOrder: 0,
        },
        encounters: {
          type: 'Array',
          fullName: 'Encounters Full Name',
          description: 'Encounters Description',
          fields: {
            diagnoses: {
              type: 'Array',
              fullName: 'Diagnoses Full Name',
              description: 'Diagnoses Description',
              fields: {
                data: {
                  type: 'String',
                  fullName: 'Data Full Name',
                  description: 'Data Description',
                  fieldName: 'data',
                  searchable: true,
                  autocomplete: 'enable',
                  parameters: {
                    renderAsHtml: false,
                    enableInCellEditing: true,
                    grouping: {
                      allowGrouping: true,
                      allowExpandGroup: true,
                    },
                    minWidth: 100,
                    allowHeaderFiltering: true,
                    headerFilter: {
                      allowSearch: true,
                    },
                    filterType: 'include',
                    allowSearch: true,
                    maxDatagridCellHeight: 70,
                  },
                  validate: [
                    {
                      validator: 'string',
                      errorMessages: {
                        default: 'Please enter correct String value',
                      },
                    },
                  ],
                  responsivePriority: 100,
                  width: 100,
                  showInDatatable: true,
                  showInViewDetails: true,
                  showInForm: true,
                  showInGraphql: true,
                  filter: 'string',
                  fieldInfo: {
                    read: true,
                    write: true,
                  },
                  detailedViewOrder: 0,
                  datagridOrder: 0,
                },
              },
              fieldName: 'diagnoses',
              width: 200,
              searchable: false,
              parameters: {
                enableInCellEditing: true,
                grouping: {
                  allowGrouping: false,
                },
                allowSearch: false,
                maxDatagridCellHeight: 70,
              },
              validate: [
                {
                  validator: 'array',
                  errorMessages: {
                    default: 'Please enter correct Array value',
                  },
                },
              ],
              responsivePriority: 100,
              showInDatatable: true,
              showInViewDetails: true,
              showInForm: true,
              showInGraphql: true,
              filter: 'none',
              fieldInfo: {
                read: true,
                write: true,
              },
              detailedViewOrder: 0,
              datagridOrder: 0,
            },
            vitalSigns: {
              type: 'Array',
              fullName: 'Vital Signs Full Name',
              description: 'Vital Signs Description',
              fields: {
                data: {
                  type: 'String',
                  fullName: 'Data Full Name',
                  description: 'Data Description',
                  fieldName: 'data',
                  searchable: true,
                  autocomplete: 'enable',
                  parameters: {
                    renderAsHtml: false,
                    enableInCellEditing: true,
                    grouping: {
                      allowGrouping: true,
                      allowExpandGroup: true,
                    },
                    minWidth: 100,
                    allowHeaderFiltering: true,
                    headerFilter: {
                      allowSearch: true,
                    },
                    filterType: 'include',
                    allowSearch: true,
                    maxDatagridCellHeight: 70,
                  },
                  validate: [
                    {
                      validator: 'string',
                      errorMessages: {
                        default: 'Please enter correct String value',
                      },
                    },
                  ],
                  responsivePriority: 100,
                  width: 100,
                  showInDatatable: true,
                  showInViewDetails: true,
                  showInForm: true,
                  showInGraphql: true,
                  filter: 'string',
                  fieldInfo: {
                    read: true,
                    write: true,
                  },
                  detailedViewOrder: 0,
                  datagridOrder: 0,
                },
                array: {
                  type: 'String[]',
                  fullName: 'Array',
                  description: 'Array',
                  fieldName: 'array',
                  autocomplete: 'enable',
                  searchable: false,
                  parameters: {
                    enableInCellEditing: true,
                    grouping: {
                      allowGrouping: true,
                      allowExpandGroup: true,
                    },
                    allowHeaderFiltering: true,
                    headerFilter: {
                      allowSearch: true,
                    },
                    filterType: 'include',
                    allowSearch: false,
                    maxDatagridCellHeight: 70,
                  },
                  width: 150,
                  responsivePriority: 100,
                  showInDatatable: true,
                  showInViewDetails: true,
                  showInForm: true,
                  showInGraphql: true,
                  filter: 'stringMultiple',
                  fieldInfo: {
                    read: true,
                    write: true,
                  },
                  detailedViewOrder: 0,
                  datagridOrder: 0,
                },
              },
              fieldName: 'vitalSigns',
              width: 200,
              searchable: false,
              parameters: {
                enableInCellEditing: true,
                grouping: {
                  allowGrouping: false,
                },
                allowSearch: false,
                maxDatagridCellHeight: 70,
              },
              validate: [
                {
                  validator: 'array',
                  errorMessages: {
                    default: 'Please enter correct Array value',
                  },
                },
              ],
              responsivePriority: 100,
              showInDatatable: true,
              showInViewDetails: true,
              showInForm: true,
              showInGraphql: true,
              filter: 'none',
              fieldInfo: {
                read: true,
                write: true,
              },
              detailedViewOrder: 0,
              datagridOrder: 0,
            },
          },
          fieldName: 'encounters',
          width: 200,
          parameters: {
            enableInCellEditing: true,
            grouping: {
              allowGrouping: false,
            },
            allowSearch: false,
            maxDatagridCellHeight: 70,
          },
          validate: [
            {
              validator: 'array',
              errorMessages: {
                default: 'Please enter correct Array value',
              },
            },
          ],
          responsivePriority: 100,
          showInDatatable: true,
          showInViewDetails: true,
          showInForm: true,
          showInGraphql: true,
          filter: 'none',
          fieldInfo: {
            read: true,
            write: true,
          },
          searchable: false,
          detailedViewOrder: 0,
          datagridOrder: 0,
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
            allowSearch: false,
          },
          fieldName: '_id',
          width: 120,
          showInForm: false,
          responsivePriority: 100,
          showInDatatable: true,
          showInViewDetails: true,
          showInGraphql: true,
          searchable: false,
          filter: 'objectId',
          fieldInfo: {
            read: true,
            write: true,
          },
          detailedViewOrder: -1000,
          datagridOrder: -1000,
          formWidth: 6,
        },
        creator: {
          type: 'LookupObjectID',
          lookup: {
            table: {
              users: {
                foreignKey: '_id',
                label: 'this.login',
                table: 'users',
              },
            },
            id: 'Model1sCreator',
          },
          index: true,
          fullName: 'Creator',
          description: 'Record Creator',
          showInDatatable: true,
          showInViewDetails: true,
          showInGraphql: true,
          searchable: false,
          parameters: {
            enableInCellEditing: false,
            allowHeaderFiltering: true,
            headerFilter: {
              allowSearch: true,
            },
            filterType: 'include',
            allowSearch: false,
            maxDatagridCellHeight: 70,
          },
          fieldName: 'creator',
          autocomplete: 'enable',
          width: 150,
          responsivePriority: 100,
          showInForm: false,
          filter: 'lookupObjectId',
          fieldInfo: {
            read: true,
            write: true,
          },
          detailedViewOrder: -1001,
          datagridOrder: -1001,
          formWidth: 6,
        },
        createdAt: {
          type: 'DateTime',
          fullName: 'Created at',
          description: 'Record Created At',
          index: true,
          showInDatatable: true,
          showInViewDetails: true,
          showInGraphql: true,
          searchable: false,
          parameters: {
            enableInCellEditing: false,
            allowHeaderFiltering: true,
            headerFilter: {
              allowSearch: true,
            },
            filterType: 'include',
            allowSearch: false,
            pickerType: 'calendar',
            openOnFieldClick: false,
            maxDatagridCellHeight: 70,
          },
          fieldName: 'createdAt',
          width: 150,
          validate: [
            {
              validator: 'dateTime',
              errorMessages: {
                default: 'Please enter correct DateTime value',
              },
            },
          ],
          responsivePriority: 100,
          showInForm: false,
          filter: 'dateTime',
          fieldInfo: {
            read: true,
            write: true,
          },
          detailedViewOrder: -1002,
          datagridOrder: -1002,
          formWidth: 6,
        },
        updatedAt: {
          type: 'DateTime',
          fullName: 'Updated at',
          description: 'Record Updated At',
          index: true,
          showInDatatable: true,
          showInViewDetails: true,
          showInGraphql: true,
          searchable: false,
          parameters: {
            enableInCellEditing: false,
            visible: false,
            allowHeaderFiltering: true,
            headerFilter: {
              allowSearch: true,
            },
            filterType: 'include',
            allowSearch: false,
            pickerType: 'calendar',
            openOnFieldClick: false,
            maxDatagridCellHeight: 70,
          },
          fieldName: 'updatedAt',
          width: 150,
          validate: [
            {
              validator: 'dateTime',
              errorMessages: {
                default: 'Please enter correct DateTime value',
              },
            },
          ],
          responsivePriority: 100,
          showInForm: false,
          filter: 'dateTime',
          fieldInfo: {
            read: true,
            write: true,
          },
          detailedViewOrder: -1003,
          datagridOrder: -1003,
          formWidth: 6,
        },
        deletedAt: {
          type: 'DateTime',
          fullName: 'Deleted at',
          description: 'Record Deleted At',
          index: true,
          showInDatatable: true,
          showInViewDetails: "this.data !== '1970-01-01T00:00:00.000Z'",
          showInGraphql: true,
          showInForm: false,
          searchable: false,
          parameters: {
            enableInCellEditing: false,
            visible: false,
            allowHeaderFiltering: true,
            headerFilter: {
              allowSearch: true,
            },
            filterType: 'include',
            allowSearch: false,
            pickerType: 'calendar',
            openOnFieldClick: false,
            maxDatagridCellHeight: 70,
          },
          fieldName: 'deletedAt',
          width: 150,
          validate: [
            {
              validator: 'dateTime',
              errorMessages: {
                default: 'Please enter correct DateTime value',
              },
            },
          ],
          responsivePriority: 100,
          filter: 'dateTime',
          fieldInfo: {
            read: true,
            write: true,
          },
          detailedViewOrder: -1004,
          datagridOrder: -1004,
          formWidth: 6,
        },
        generatorBatchName: {
          type: 'String',
          showInDatatable: false,
          showInViewDetails: 'this.data !== null',
          showInForm: false,
          showInGraphql: false,
          searchable: false,
          generated: true,
          fullName: 'Generator Batch Name',
          description: 'Set to the ID of generator batch for synthetic records',
          fieldName: 'generatorBatchName',
          autocomplete: 'enable',
          parameters: {
            renderAsHtml: false,
            enableInCellEditing: true,
            grouping: {
              allowGrouping: true,
              allowExpandGroup: true,
            },
            minWidth: 100,
            allowHeaderFiltering: true,
            headerFilter: {
              allowSearch: true,
            },
            filterType: 'include',
            allowSearch: false,
            maxDatagridCellHeight: 70,
          },
          validate: [
            {
              validator: 'string',
              errorMessages: {
                default: 'Please enter correct String value',
              },
            },
          ],
          responsivePriority: 100,
          width: 100,
          filter: 'string',
          fieldInfo: {
            read: true,
            write: true,
          },
          detailedViewOrder: -1005,
          datagridOrder: -1005,
          formWidth: 6,
        },
        'systemFieldsSeparator': {
          'type': 'FormSeparator',
          'showInDatatable': false,
          'showInViewDetails': true,
          'showInForm': false,
          'showInGraphql': false,
          'searchable': false,
          'parameters': {
            'height': '4px',
            'lineStyle': '',
            'lineColor': '',
            'lineWidth': 0,
            'enableInCellEditing': false,
            'grouping': {
              'allowGrouping': false,
            },
            'allowHeaderFiltering': false,
            'headerFilter': {
              'allowSearch': false,
            },
            'allowSearch': false,
          },
          'fieldName': 'systemFieldsSeparator',
          'virtual': true,
          'detailedViewOrder': 0,
          'datagridOrder': 0,
          'fullName': 'System fields separator',
          'responsivePriority': 100,
          'width': 100,
          'filter': 'none',
          'fieldInfo': {
            'read': true,
            'write': true,
          },
        },
      },
      schemaName: 'model1s',
      collectionName: 'model1s',
      recordActionsLayout: 'menu',
      actions: {
        width: 60,
        responsivePriority: -1,
        fields: {
          update: {
            description: 'Update record',
            position: 'grid.row',
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
            actionOrder: 1,
            actionName: 'update',
          },
          delete: {
            description: 'Delete record',
            position: 'grid.row',
            backgroundColor: '#F44336',
            borderColor: '#f32c1e',
            textColor: 'white',
            icon: {
              link: 'trash',
            },
            action: {
              type: 'action',
              link: 'delete',
            },
            actionOrder: 2,
            actionName: 'delete',
          },
          clone: {
            description: 'Clone record',
            position: 'grid.row',
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
            actionOrder: 3,
            actionName: 'clone',
          },
          viewDetails: {
            description: 'View record details',
            position: 'grid.row',
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
            actionOrder: 4,
            actionName: 'viewDetails',
          },
          view: {
            showInTable: false,
            actionName: 'view',
          },
          upsert: {
            showInTable: false,
            actionName: 'upsert',
          },
          create: {
            fullName: 'Create Record',
            description: 'Create new record',
            backgroundColor: '#2196F3',
            borderColor: '#0c7cd5',
            textColor: 'white',
            position: 'grid.top.left',
            showInTable: false,
            action: {
              type: 'action',
              link: 'create',
            },
            actionOrder: 7,
            actionName: 'create',
          },
          group: {
            position: 'grid.top.left',
            showInTable: false,
            action: {
              type: 'action',
              link: 'group',
            },
            actionOrder: 8,
            actionName: 'group',
          },
          search: {
            position: 'grid.top.right',
            showInTable: false,
            fullName: 'Search....',
            action: {
              type: 'action',
              link: 'search',
            },
            actionOrder: 9,
            actionName: 'search',
          },
          print: {
            position: 'grid.top.right',
            showInTable: false,
            description: 'Print all records',
            icon: {
              link: 'print',
            },
            action: {
              type: 'module',
              link: 'AdpGridPrint',
            },
            actionOrder: 10,
            actionName: 'print',
          },
          manageViews: {
            position: 'grid.top.right',
            showInTable: false,
            description: 'Manage grid views',
            icon: {
              type: 'dx',
              link: 'detailslayout',
            },
            action: {
              type: 'module',
              link: 'AdpGridViewManager',
            },
            actionOrder: 11,
            actionName: 'manageViews',
          },
          quickFilter: {
            position: 'grid.top.right',
            showInTable: false,
            description: 'Apply quick filter',
            icon: {
              link: 'filter',
            },
            action: {
              type: 'module',
              link: 'AdpGridQuickFilter',
            },
            actionOrder: 12,
            actionName: 'quickFilter',
          },
          export: {
            position: 'grid.top.right',
            showInTable: false,
            description: 'Export collection',
            icon: {
              type: 'font-awesome',
              link: 'download',
            },
            action: {
              type: 'module',
              link: 'AdpDataExport',
            },
            actionOrder: 13,
            actionName: 'export',
          },
          import: {
            position: 'grid.top.right',
            showInTable: false,
            description: 'Import data into collection',
            icon: {
              type: 'font-awesome',
              link: 'upload',
            },
            action: {
              type: 'module',
              link: 'AdpDataImport',
            },
            actionOrder: 14,
            actionName: 'import',
          },
          syntheticGenerate: {
            position: 'grid.top.right',
            showInTable: false,
            description: 'Synthetic content generator',
            icon: {
              type: 'font-awesome',
              link: 'magic',
            },
            action: {
              type: 'module',
              link: 'AdpSyntheticGenerate',
            },
            actionOrder: 15,
            actionName: 'syntheticGenerate',
          },
          chooseColumns: {
            position: 'grid.top.right',
            showInTable: false,
            description: 'Configure grid columns',
            icon: {
              link: 'columns',
            },
            action: {
              type: 'module',
              link: 'AdpGridColumnChooser',
            },
            actionOrder: 16,
            actionName: 'chooseColumns',
          },
          filterBuilder: {
            position: 'grid.top.right',
            showInTable: false,
            description: 'Advanced Filtering Expressions Builder',
            icon: {
              type: 'font-awesome',
              link: 'search-plus',
            },
            action: {
              type: 'module',
              link: 'AdpFilterBuilder',
            },
            actionOrder: 17,
            actionName: 'filterBuilder',
          },
          submit: {
            fullName: {
              code: "({ create: 'Add', clone: 'Add', cloneDataSet: 'Add', update: 'Update' })[this.action]",
              type: 'function',
            },
            position: 'form.bottom',
            description: 'Submit form data',
            action: {
              type: 'module',
              link: 'AdpFormActions',
              method: 'submit',
            },
            actionOrder: 3,
            htmlAttributes: {
              type: 'submit',
              className: 'adp-action-b-primary',
            },
            showInTable: false,
            actionName: 'submit',
          },
          apply: {
            fullName: 'Apply',
            position: 'form.bottom',
            description: 'Apply',
            action: {
              type: 'module',
              link: 'AdpFormActions',
              method: 'apply',
            },
            actionOrder: 2,
            htmlAttributes: {
              type: 'submit',
              className: 'adp-action-b-tertiary',
            },
            showInTable: false,
            actionName: 'apply',
          },
          cancelSubmit: {
            fullName: 'Cancel',
            position: 'form.bottom',
            description: 'Cancel record edit',
            action: {
              type: 'module',
              link: 'AdpFormActions',
              method: 'cancel',
            },
            showInTable: false,
            actionOrder: 1,
            htmlAttributes: {
              className: 'adp-action-b-secondary',
            },
            actionName: 'cancelSubmit',
          },
          gridDbChangeNotification: {
            position: 'rtc',
            action: {
              type: 'module',
              link: 'AdpRtcActions',
              method: 'gridDbChangeNotification',
              params: {
                minTimeBetweenReloads: 3000,
              },
            },
            showInTable: false,
            actionOrder: 1,
            actionName: 'gridDbChangeNotification',
          },
        },
      },
      parameters: {
        allowColumnReordering: true,
        allowColumnResizing: true,
        columnResizingMode: 'widget',
        columnHidingEnabled: true,
        filterRow: {
          visible: true,
        },
        headerFilter: {
          visible: true,
        },
        columnFixing: {
          enabled: true,
        },
        stateStoring: {
          enabled: true,
          type: 'localStorage',
          storageKey: 'storage',
        },
        pager: {
          showPageSizeSelector: true,
          allowedPageSizes: [10, 50, 100],
          showInfo: true,
          showNavigationButtons: true,
          visible: true,
        },
        sorting: {
          mode: 'multiple',
        },
        paging: {
          pageSize: 10,
          enabled: true,
        },
        selection: {
          selectAllMode: 'page',
          mode: 'single',
        },
        enableInCellEditing: false,
        hoverStateEnabled: true,
        loadInvisibleFields: true,
      },
      defaultSortBy: {
        _id: -1,
      },
    };
    this.batchNumberField = {
      generatorBatchName: {
        type: 'String',
        showInViewDetails: 'this.data !== null',
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
    this.notWritableFields = {
      fields: {
        creator: {
          fieldInfo: {
            write: false,
          },
        },
        createdAt: {
          fieldInfo: {
            write: false,
          },
        },
        updatedAt: {
          fieldInfo: {
            write: false,
          },
        },
        deletedAt: {
          fieldInfo: {
            write: false,
          },
        },
      },
    };

    this.appLib = prepareEnv();

    this.db = await getMongoConnection(this.appLib.options.MONGODB_URI);
  });

  after(async function () {
    await this.db.dropDatabase();
    await this.db.close();
  });

  afterEach(function () {
    return this.appLib.shutdown();
  });

  beforeEach(async function () {
    await Promise.all([
      this.db.collection('users').deleteMany({}),
      this.db.collection('mongoMigrateChangeLog').deleteMany({}),
    ]);
    await Promise.all([this.db.collection('users').insertOne(admin)]);
  });

  it('responds with correct schema for the model when enablePermissions=false', async function () {
    setAppAuthOptions(this.appLib, {
      requireAuthentication: true,
      enablePermissions: false,
    });
    await this.appLib.setup();
    const additionalData = { fields: this.batchNumberField };
    this.expectedData = _.merge({}, this.expected, additionalData);
    const token = await loginWithUser(this.appLib, admin);
    const res = await apiRequest(this.appLib)
      .get('/app-model')
      .set('Accept', 'application/json')
      .set('Authorization', `JWT ${token}`)
      .expect('Content-Type', /json/);
    res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
    res.body.success.should.equal(true, res.body.message);
    const { model1s } = res.body.data.models;
    assert(
      _.isEqual(model1s, this.expectedData),
      `Diff: ${JSON.stringify(diffObjects(this.expectedData, model1s), null, 2)}`
    );
  });

  it('responds with correct schema for the model when enablePermissions=true', async function () {
    setAppAuthOptions(this.appLib, {
      requireAuthentication: true,
      enablePermissions: true,
    });
    await this.appLib.setup();
    const additionalData = { fields: this.batchNumberField };
    this.expectedData = _.merge({}, this.expected, additionalData, this.notWritableFields);
    const token = await loginWithUser(this.appLib, admin);
    const res = await apiRequest(this.appLib)
      .get('/app-model')
      .set('Accept', 'application/json')
      .set('Authorization', `JWT ${token}`)
      .expect('Content-Type', /json/);
    res.statusCode.should.equal(200, JSON.stringify(res, null, 4));
    res.body.success.should.equal(true, res.body.message);
    const { model1s } = res.body.data.models;
    assert(
      _.isEqual(model1s, this.expectedData),
      `Diff: ${JSON.stringify(diffObjects(this.expectedData, model1s), null, 2)}`
    );
  });
});
