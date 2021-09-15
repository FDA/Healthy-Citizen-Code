const should = require('should');
const path = require('path');

const { prepareEnv } = require('../test-util');

describe('Macros', () => {
  before(async function () {
    this.appLib = prepareEnv();
  });

  afterEach(async function () {
    return this.appLib.shutdown();
  });

  function getAppModelSources(macrosModel) {
    return [
      path.join(__dirname, './model_parts/0_macros_definition.json'),
      path.join(__dirname, `./model_parts/${macrosModel}`),
      {
        interface: {
          app: {
            auth: {
              requireAuthentication: false,
              enablePermissions: false,
            },
          },
        },
      },
    ];
  }

  it(`should insert strings from file and inline macros`, async function () {
    const { appLib } = this;
    appLib.setOptions({ appModelSources: getAppModelSources('macros.json') });

    await this.appLib.setup();

    const { f1, f2, f3 } = this.appLib.appModel.models.macros.fields;
    should(f1).be.containDeep({
      type: 'String',
      list: {
        name: 'f1',
        scopes: {
          somescope: {
            permissions: {
              view: 'accessAsUser',
            },
            where: 'return true',
            return: 'return $list',
          },
        },
        values: {
          a: 'a',
        },
        isDynamicList: false,
      },
    });

    should(f2).be.containDeep({
      type: 'String',
      list: {
        name: 'f2',
        scopes: {
          userScope: {
            permissions: {
              view: 'accessAsGuest',
            },
            where: 'return true',
            return: 'return $list',
          },
        },
        values: {
          a: 'a',
        },
        isDynamicList: false,
      },
    });

    should(f3).be.containDeep({
      type: 'String',
      list: {
        name: 'f3',
        values: {
          b: 'b',
        },
        scopes: {
          userScope: {
            permissions: {
              view: 'accessAsUser',
            },
            where: 'return true',
            return: 'return $list',
          },
        },
        isDynamicList: false,
      },
    });
  });

  it(`should insert strings from recursive macros`, async function () {
    const { appLib } = this;
    appLib.setOptions({ appModelSources: getAppModelSources('macros_recursive.json') });

    await this.appLib.setup();

    const { recursiveMacroField } = this.appLib.appModel.models.macros_recursive.fields;
    should(recursiveMacroField.fields.f3).be.containDeep({
      type: 'String',
      list: {
        name: 'f3',
        values: {
          b: 'b',
        },
        scopes: {
          userScope: {
            permissions: {
              view: 'accessAsUser',
            },
            where: 'return true',
            return: 'return $list',
          },
        },
        isDynamicList: false,
      },
    });
  });

  it(`should fail for infinite recursive macros`, async function () {
    const { appLib } = this;
    appLib.setOptions({ appModelSources: getAppModelSources('macros_infinite_recursive.json') });

    await this.appLib.setup().should.be.rejectedWith(/The maximum number of recursive calls \(\d+\) has been reached/);
  });

  it(`should fail for invalid macros name`, async function () {
    const { appLib } = this;
    appLib.setOptions({ appModelSources: getAppModelSources('macros_invalid_name.json') });

    await this.appLib.setup().should.be.rejectedWith(/Unknown macro invalidMacroName/);
  });

  it(`should fail for invalid json after macros work`, async function () {
    const { appLib } = this;
    appLib.setOptions({ appModelSources: getAppModelSources('macros_error.json') });

    await this.appLib.setup().should.be.rejectedWith('Unknown attribute macros_error.fields.f1.f3');
  });
});
