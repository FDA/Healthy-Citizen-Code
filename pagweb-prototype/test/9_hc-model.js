// test public folder
// test model validation (try to feed incorrect model spec)
// TODO: test validator on various strings
const _ = require("lodash");
const assert = require("assert");

describe("V5 Schema Routes", () => {
  before(function () {
    this.appLib = require(process.env.APP_LIB_MODULE_PATH)();
    return this.appLib.setup();
  });

  after(function () {
    return this.appLib.shutdown();
  });

  it("Generates core models", function (done) {
    const { appModel } = this.appLib;
    assert(!_.isEmpty(appModel.metaschema));
    assert(!_.isEmpty(appModel.interface));
    assert(!_.isEmpty(appModel.interface.mainMenu));

    const { models } = appModel;
    assert(!_.isEmpty(models.users));
    assert(!_.isEmpty(models.connections));

    done();
  });
});
