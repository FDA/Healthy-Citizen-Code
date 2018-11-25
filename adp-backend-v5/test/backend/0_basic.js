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

const reqlib = require('app-root-path').require;

const accessCfg = reqlib('/lib/access-config');
// TODO: add check on transformation array of permissions to objects
describe('V5 Core Utility', () => {
  describe('validateAndCleanupAppModel', () => {
    it('removes comments, adds type defaults, assumes type', done => {
      const appLib = {
        appModel: _.cloneDeep(sampleModel1),
        getAuthSettings: () => ({}),
        accessCfg,
      };
      const mutil = reqlib('/lib/model')(appLib);
      const errors = mutil.validateAndCleanupAppModel();
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
      done();
    });
    it('validates lookups', done => {
      const appLib = {
        appModel: _.cloneDeep(sampleModel2WithLookups),
        getAuthSettings: () => ({}),
        accessCfg,
      };
      const mutil = reqlib('/lib/model')(appLib);
      const errors = mutil.validateAndCleanupAppModel();
      errors.length.should.equal(3, errors.join('\n'));
      errors[0].should.equal('Lookup in M3.fields.F1 refers to nonexisting collection "M0"');
      errors[1].should.equal('Lookup in M4.fields.F1 refers to nonexisting foreignKey "F1a"');
      errors[2].should.equal('Lookup in M4.fields.F1 refers to nonexisting label "F1a"');
      done();
    });
    it('validates defaultSortBy', done => {
      const appLib = {
        appModel: _.cloneDeep(sampleModel3DefaultSortBy),
        getAuthSettings: () => ({}),
        accessCfg,
      };
      const mutil = reqlib('/lib/model')(appLib);
      const errors = mutil.validateAndCleanupAppModel();
      errors.length.should.equal(3, errors.join('\n'));
      errors[0].should.equal(
        'defaultSortBy in M2 has incorrect format, the sorting order must be either 1 or -1'
      );
      errors[1].should.equal('defaultSortBy in M3 refers to nonexisting field "F2"');
      errors[2].should.equal('defaultSortBy in M4 has incorrect format, must be an object');
      done();
    });
    it('validates validators and transformers presence', done => {
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
      const errors = mutil.validateAndCleanupAppModel();
      errors.length.should.equal(4, errors.join('\n'));
      errors[0].should.equal(`Validator "validator0" doesn't exist in M2.fields.F1`);
      errors[1].should.equal(`Transformer "transformer0" doesn't exist in M2.fields.F1`);
      errors[2].should.equal(`Transformer "transformer3" doesn't exist in M2.fields.F1`);
      errors[3].should.equal(
        `Transformer "transformer2,transformer3,transformer4" doesn't look right in M2.fields.F1 (if array then must contain only two elements)`
      );
      done();
    });
  });
});
