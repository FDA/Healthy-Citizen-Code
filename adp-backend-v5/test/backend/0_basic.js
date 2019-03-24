/**
 TODO: Test core essential functions:
 model#validateAndCleanupAppModel
 */
// TODO: either get rid of asserts in tests or replace them with assert(test, MESSAGE)
const _ = require('lodash');
require('should');

const sampleModel1 = {
  metaschema: {
    A1: {
      default: 'T1',
    },
    A2: {},
    SA1: {},
    type: {
      default: 'T2',
    },
    comment: {},
    fields: {},
    subtype: {},
    visible: {
      default: true,
      type: 'Boolean',
      fullName: 'Visible',
      description:
        'Determines if the field should be visible in the forms by default or not. Can be overridden in a specific form, but will be sent to the front-end',
    },
    showInDatatable: {
      default: true,
      type: 'Boolean',
      fullName: 'Show In Datatable',
      description: 'If set to true (default) then this field will be displayed in the datatables.',
    },
    showInViewDetails: {
      default: true,
      type: 'Boolean',
      fullName: 'Show In Form of viewDetails action',
      description:
        'If set to true (default) then this field will be displayed in the viewDetails action form.',
    },
    showInForm: {
      default: true,
      type: 'Boolean',
      fullName: 'Show In Form',
      description: 'If set to true (default) then this field will be displayed in the form.',
    },
    showInGraphQL: {
      default: true,
      type: 'Boolean',
      fullName: 'Show In GraphQL',
      description:
        'If set to true (default) then this field will be added to GraphQL type thus it can be present in Query.',
    },
    permissions: {},
  },
  typeDefaults: {
    fields: {
      T1: {
        A1: 'V1',
      },
      T2: {
        A2: 'V2',
        subtype: 'ST1',
      },
    },
  },
  subtypeDefaults: {
    fields: {
      ST1: {
        SA1: 'SV1',
      },
    },
  },
  models: {
    M1: {
      comment: 'test',
      A1: 'V3',
      fields: {
        F1: {
          type: 'T1',
        },
      },
    },
  },
};
const sampleModel2WithLookups = {
  // for testing lookups
  metaschema: {
    A1: {
      default: 'T1',
    },
    A2: {},
    SA1: {},
    type: {
      default: 'T2',
    },
    comment: {},
    fields: {},
    visible: {
      default: true,
      type: 'Boolean',
      fullName: 'Visible',
      description:
        'Determines if the field should be visible in the forms by default or not. Can be overridden in a specific form, but will be sent to the front-end',
    },
    showInDatatable: {
      default: true,
      type: 'Boolean',
      fullName: 'Show In Datatable',
      description: 'If set to true (default) then this field will be displayed in the datatables.',
    },
    showInViewDetails: {
      default: true,
      type: 'Boolean',
      fullName: 'Show In Form of viewDetails action',
      description:
        'If set to true (default) then this field will be displayed in the viewDetails action form.',
    },
    showInForm: {
      default: true,
      type: 'Boolean',
      fullName: 'Show In Form',
      description: 'If set to true (default) then this field will be displayed in the form.',
    },
    showInGraphQL: {
      default: true,
      type: 'Boolean',
      fullName: 'Show In GraphQL',
      description:
        'If set to true (default) then this field will be added to GraphQL type thus it can be present in Query.',
    },
    subtype: {},
    lookup: {},
    transform: {},
    permissions: {},
  },
  models: {
    M1: {
      comment: 'test',
      A1: 'V3',
      fields: {
        F1: {
          type: 'T1',
        },
      },
    },
    M2: {
      comment: 'test',
      A1: 'V3',
      fields: {
        F1: {
          type: 'T1',
          lookup: {
            // good lookup, should have no errors
            table: 'M1',
            foreignKey: 'F1',
            label: 'F1',
            id: 'F1',
          },
        },
      },
    },
    M3: {
      comment: 'test',
      A1: 'V3',
      fields: {
        F1: {
          type: 'T1',
          lookup: {
            table: 'M0', // doesn't exist
            foreignKey: 'F1',
            label: 'F1',
            id: 'F1',
          },
        },
      },
    },
    M4: {
      comment: 'test',
      A1: 'V3',
      fields: {
        F1: {
          type: 'T1',
          lookup: {
            table: 'M1',
            foreignKey: 'F1a', // doesn't exist
            label: 'F1a', // doesn't exist
            id: 'F1a', // doesn't exist
          },
        },
      },
    },
  },
};
const sampleModel3DefaultSortBy = {
  metaschema: {
    A1: {
      default: 'T1',
    },
    A2: {},
    SA1: {},
    type: {
      default: 'T2',
    },
    comment: {},
    fields: {},
    subtype: {},
    visible: {
      default: true,
      type: 'Boolean',
      fullName: 'Visible',
      description:
        'Determines if the field should be visible in the forms by default or not. Can be overridden in a specific form, but will be sent to the front-end',
    },
    showInDatatable: {
      default: true,
      type: 'Boolean',
      fullName: 'Show In Datatable',
      description: 'If set to true (default) then this field will be displayed in the datatables.',
    },
    showInViewDetails: {
      default: true,
      type: 'Boolean',
      fullName: 'Show In Form of viewDetails action',
      description:
        'If set to true (default) then this field will be displayed in the viewDetails action form.',
    },
    showInForm: {
      default: true,
      type: 'Boolean',
      fullName: 'Show In Form',
      description: 'If set to true (default) then this field will be displayed in the form.',
    },
    showInGraphQL: {
      default: true,
      type: 'Boolean',
      fullName: 'Show In GraphQL',
      description:
        'If set to true (default) then this field will be added to GraphQL type thus it can be present in Query.',
    },
    defaultSortBy: {},
    permissions: {},
  },
  models: {
    M1: {
      comment: 'test',
      A1: 'V3',
      defaultSortBy: { F1: -1 }, // valid
      fields: {
        F1: {
          type: 'T1',
        },
      },
    },
    M2: {
      comment: 'test',
      A1: 'V3',
      defaultSortBy: { F1: 'test' }, // incorrect order
      fields: {
        F1: {
          type: 'T1',
        },
      },
    },
    M3: {
      comment: 'test',
      A1: 'V3',
      defaultSortBy: { F2: -1 }, // doesn't exist
      fields: {
        F1: {
          type: 'T1',
        },
      },
    },
    M4: {
      comment: 'test',
      A1: 'V3',
      defaultSortBy: 'F1', // no direction
      fields: {
        F1: {
          type: 'T1',
        },
      },
    },
  },
};
const sampleModel4ValidatorsAndTransformers = {
  metaschema: {
    A1: {
      default: 'T1',
    },
    A2: {},
    SA1: {},
    type: {
      default: 'T2',
    },
    comment: {},
    fields: {},
    visible: {
      default: true,
      type: 'Boolean',
      fullName: 'Visible',
      description:
        'Determines if the field should be visible in the forms by default or not. Can be overridden in a specific form, but will be sent to the front-end',
    },
    showInDatatable: {
      default: true,
      type: 'Boolean',
      fullName: 'Show In Datatable',
      description: 'If set to true (default) then this field will be displayed in the datatables.',
    },
    showInViewDetails: {
      default: true,
      type: 'Boolean',
      fullName: 'Show In Form of viewDetails action',
      description:
        'If set to true (default) then this field will be displayed in the viewDetails action form.',
    },
    showInForm: {
      default: true,
      type: 'Boolean',
      fullName: 'Show In Form',
      description: 'If set to true (default) then this field will be displayed in the form.',
    },
    showInGraphQL: {
      default: true,
      type: 'Boolean',
      fullName: 'Show In GraphQL',
      description:
        'If set to true (default) then this field will be added to GraphQL type thus it can be present in Query.',
    },
    subtype: {},
    validate: {},
    transform: {},
    permissions: {},
  },
  models: {
    M1: {
      comment: 'test',
      A1: 'V3',
      fields: {
        F1: {
          // no validators or transformers
          type: 'T1',
        },
      },
    },
    M2: {
      comment: 'test',
      A1: 'V3',
      fields: {
        F1: {
          type: 'T1',
          validate: [
            {
              validator: 'validator0',
              arguments: {
                length: '$1',
              },
              errorMessages: {
                default: 'Value is too short, should be at least $length characters long',
              },
            },
            {
              validator: 'validator1',
              arguments: {
                length: '$1',
              },
              errorMessages: {
                default: 'Value is too short, should be at least $length characters long',
              },
            },
          ],
          transform: [
            'transformer0',
            'transformer1',
            ['transformer2', 'transformer3', 'transformer4'],
          ],
        },
      },
    },
  },
};
const sampleRequiredValidation = {
  metaschema: {
    type: {
      default: 'T2',
    },
    comment: {},
    fields: {},
    visible: {
      default: true,
      type: 'Boolean',
      fullName: 'Visible',
      description:
        'Determines if the field should be visible in the forms by default or not. Can be overridden in a specific form, but will be sent to the front-end',
    },
    showInDatatable: {
      default: true,
      type: 'Boolean',
      fullName: 'Show In Datatable',
      description: 'If set to true (default) then this field will be displayed in the datatables.',
    },
    showInViewDetails: {
      default: true,
      type: 'Boolean',
      fullName: 'Show In Form of viewDetails action',
      description:
        'If set to true (default) then this field will be displayed in the viewDetails action form.',
    },
    showInForm: {
      default: true,
      type: 'Boolean',
      fullName: 'Show In Form',
      description: 'If set to true (default) then this field will be displayed in the form.',
    },
    showInGraphQL: {
      default: true,
      type: 'Boolean',
      fullName: 'Show In GraphQL',
      description:
        'If set to true (default) then this field will be added to GraphQL type thus it can be present in Query.',
    },
    subtype: {},
    validate: {},
    transform: {},
    permissions: {},
  },
  models: {
    complexTypes: {
      type: 'Schema',
      fields: {
        object1: {
          type: 'Object',
          description: 'Object level require with nested fields with require',
          fullName: 'Object level require with nested fields with require',
          required: true,
          fields: {
            string1: {
              type: 'String',
              required: true,
            },
            string2: {
              type: 'String',
            },
            number: {
              type: 'Number',
            },
            boolean1: {
              type: 'Boolean',
              required: true,
            },
          },
        },
        array1: {
          type: 'Array',
          description: 'Required Array',
          fullName: 'Required Array',
          required: true,
          fields: {
            string: {
              type: 'String',
              required: true,
            },
            number: {
              type: 'Number',
            },
            boolean1: {
              type: 'Boolean',
              required: true,
            },
          },
        },
        object2: {
          type: 'Object',
          fullName: 'Object level require without nested required fields',
          required: true,
          fields: {
            string1: {
              type: 'String',
              description: 'String',
            },
            string2: {
              type: 'String',
              description: 'String',
            },
          },
        },
        array2: {
          type: 'Array',
          fullName: 'Array level require without nested required fields',
          required: true,
          fields: {
            string: {
              type: 'String',
            },
            boolean1: {
              type: 'Boolean',
            },
          },
        },
        nested1: {
          type: 'Object',
          fullName: 'Object type field with nested objects',
          description: 'Nested Object level 1',
          fields: {
            stringLevel1: {
              type: 'String',
              required: true,
            },
            level2: {
              type: 'Object',
              fullName: 'Nested Object level 2',
              required: true,
              fields: {
                stringLevel2: {
                  type: 'String',
                },
                level3: {
                  type: 'Object',
                  fullName: 'Nested Object level 3',
                  fields: {
                    stringLevel3: {
                      type: 'String',
                      required: true,
                    },
                    stringLevel34: {
                      type: 'String',
                      width: 100,
                    },
                  },
                },
              },
            },
          },
        },
        nested2: {
          type: 'Array',
          fullName: 'Array Of Arrays',
          fields: {
            string1: {
              type: 'String',
              fullName: 'arrayOfArrays String field',
            },
            arrayLevel1: {
              type: 'Array',
              fullName: 'Array of arrays level 1',
              fields: {
                string1: {
                  type: 'String',
                  fullName: 'arrayLevel1 String field',
                },
                arrayLevel2: {
                  type: 'Array',
                  fullName: 'Array of arrays level 2',
                  fields: {
                    string1: {
                      type: 'String',
                      fullName: 'arrayLevel2 required String field',
                      required: true,
                    },
                    string2: {
                      type: 'String',
                      fullName: 'arrayLevel2 not required String field',
                    },
                    arrayLevel3: {
                      type: 'Array',
                      required: true,
                      fields: {
                        string1: {
                          type: 'String',
                          fullName: 'String field 1',
                        },
                      },
                    },
                    objectLevel3: {
                      type: 'Object',
                      required: true,
                      fields: {
                        string1: {
                          type: 'String',
                          fullName: 'String field 1',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

const reqlib = require('app-root-path').require;

const accessCfg = reqlib('/lib/access/access-config');
// TODO: add check on transformation array of permissions to objects
describe('V5 Core Utility', () => {
  describe('validateAndCleanupAppModel', () => {
    it('removes comments, adds type defaults, assumes type', () => {
      const appLib = {
        appModel: _.cloneDeep(sampleModel1),
        getAuthSettings: () => ({}),
        accessCfg,
      };
      const mutil = reqlib('/lib/model')(appLib);
      const { errors, warnings } = mutil.validateAndCleanupAppModel();
      errors.length.should.equal(0, errors.join('\n')); // sampleModel1 has no errors
      appLib.appModel.models.M1.should.not.have.property('comment'); // comments removed
      appLib.appModel.models.M1.type.should.equal('T2'); // default type assigned

      // merge type defaults for assumed type
      appLib.appModel.models.M1.should.have.property('A2');
      appLib.appModel.models.M1.A2.should.equal('V2');
      // merge type defaults for explicit type
      appLib.appModel.models.M1.fields.F1.should.have.property('A1');
      appLib.appModel.models.M1.fields.F1.A1.should.equal('V1');
      // merge subtype defaults for assumed type and subtype
      appLib.appModel.models.M1.should.have.property('subtype');
      appLib.appModel.models.M1.subtype.should.equal('ST1');
      appLib.appModel.models.M1.should.have.property('SA1');
      appLib.appModel.models.M1.SA1.should.equal('SV1');
      // type defaults should not override existing values
      appLib.appModel.models.M1.should.have.property('A1');
      appLib.appModel.models.M1.A1.should.equal('V3');

      warnings.length.should.equal(0, errors.join('\n'));
    });
    it('validates lookups', () => {
      const appLib = {
        appModel: _.cloneDeep(sampleModel2WithLookups),
        getAuthSettings: () => ({}),
        accessCfg,
      };
      const mutil = reqlib('/lib/model')(appLib);
      const { errors } = mutil.validateAndCleanupAppModel();
      errors.length.should.equal(3, errors.join('\n'));
      errors[0].should.equal('Lookup in M3.fields.F1 refers to nonexisting collection "M0"');
      errors[1].should.equal('Lookup in M4.fields.F1 refers to nonexisting foreignKey "F1a"');
      errors[2].should.equal('Lookup in M4.fields.F1 refers to nonexisting label "F1a"');
    });
    it('validates defaultSortBy', () => {
      const appLib = {
        appModel: _.cloneDeep(sampleModel3DefaultSortBy),
        getAuthSettings: () => ({}),
        accessCfg,
      };
      const mutil = reqlib('/lib/model')(appLib);
      const { errors } = mutil.validateAndCleanupAppModel();
      errors.length.should.equal(3, errors.join('\n'));
      errors[0].should.equal(
        'defaultSortBy in M2 has incorrect format, the sorting order must be either 1 or -1'
      );
      errors[1].should.equal('defaultSortBy in M3 refers to nonexisting field "F2"');
      errors[2].should.equal('defaultSortBy in M4 has incorrect format, must be an object');
    });
    it('validates validators and transformers presence', () => {
      const appLib = {
        appModel: _.cloneDeep(sampleModel4ValidatorsAndTransformers),
        getAuthSettings: () => ({}),
        accessCfg,
        appModelHelpers: {
          Validators: { validator1: 'test' },
          Transformers: { transformer1: 'test', transformer2: 'test' },
        },
      };
      const mutil = reqlib('/lib/model')(appLib);
      const { errors } = mutil.validateAndCleanupAppModel();
      errors.length.should.equal(4, errors.join('\n'));
      errors[0].should.equal(`Validator "validator0" doesn't exist in M2.fields.F1`);
      errors[1].should.equal(`Transformer "transformer0" doesn't exist in M2.fields.F1`);
      errors[2].should.equal(`Transformer "transformer3" doesn't exist in M2.fields.F1`);
      errors[3].should.equal(
        `Transformer "transformer2,transformer3,transformer4" doesn't look right in M2.fields.F1 (if array then must contain only two elements)`
      );
    });
    it('validates required field contradictions', () => {
      const appLib = {
        appModel: _.cloneDeep(sampleRequiredValidation),
        getAuthSettings: () => ({}),
        accessCfg,
      };
      const mutil = reqlib('/lib/model')(appLib);
      const { warnings } = mutil.validateAndCleanupAppModel();
      warnings.length.should.equal(5, warnings.join('\n'));
      warnings[0].should.equal(
        "Model part by path 'complexTypes.object2' is required but doesn't have any required field"
      );
      warnings[1].should.equal(
        "Model part by path 'complexTypes.array2' is required but doesn't have any required field"
      );
      warnings[2].should.equal(
        "Model part by path 'complexTypes.nested1.level2' is required but doesn't have any required field"
      );
      warnings[3].should.equal(
        "Model part by path 'complexTypes.nested2.arrayLevel1.arrayLevel2.arrayLevel3' is required but doesn't have any required field"
      );
      warnings[4].should.equal(
        "Model part by path 'complexTypes.nested2.arrayLevel1.arrayLevel2.objectLevel3' is required but doesn't have any required field"
      );
    });
  });
});
