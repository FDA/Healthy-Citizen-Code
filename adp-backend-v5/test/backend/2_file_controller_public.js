const Promise = require('bluebird');
const should = require('should');

const { getMongoConnection, setAppAuthOptions, prepareEnv, resourceRequest } = require('../test-util');

describe('File Controller', () => {
  describe('Serving public files', () => {
    before(async function () {
      this.appLib = prepareEnv();

      setAppAuthOptions(this.appLib, {
        requireAuthentication: false,
        enablePermissions: false,
      });
      const db = await getMongoConnection(this.appLib.options.MONGODB_URI);
      this.db = db;
    });

    after(async function () {
      await this.db.dropDatabase();
      await this.db.close();
    });

    beforeEach(async function () {
      await this.appLib.setup();
    });

    afterEach(function () {
      return this.appLib.shutdown();
    });

    it('Should show merged files for dir "/public/js/client-modules" from core and app model', async function () {
      const res = await resourceRequest(this.appLib).get('/public/js/client-modules');
      const { success, data } = res.body;
      should(success).equal(true);

      const filesList = [
        { name: 'test-module.js' },
        { name: 'client/client.module.js' },
        { name: 'nested/nested_file.js' },
        { name: 'nested/another_nested/another_nested_file.js' },
        { name: 'adp-bpm-diagrams/adp-bpm-diagrams.module.js' },
        { name: 'adp-bpm-diagrams/adp-bpm-editor.css', mimeType: 'text/css' },
        { name: 'adp-bpm-diagrams/adp-bpm.helper.js' },
        { name: 'adp-bpm-diagrams/adp-decision-menu.helper.js' },
        { name: 'adp-client-common/adp-client-common.module.js' },
        { name: 'adp-data-export/adp-data-export-generators.service.js' },
        { name: 'adp-data-export/adp-data-export.helpers.js' },
        { name: 'adp-data-export/adp-data-export.module.js' },
        { name: 'adp-data-export/adp-data-export.service.js' },
        { name: 'adp-data-export/adp-export-config-modal.component.js' },
        { name: 'adp-data-export/adp-export-config-modal.controller.js' },
        { name: 'adp-data-import/adp-data-import-report-modal.component.js' },
        { name: 'adp-data-import/adp-data-import.module.js' },
        { name: 'adp-data-import/adp-data-import.service.js' },
        { name: 'adp-grid-column-chooser/adp-grid-column-chooser.module.js' },
        { name: 'adp-grid-control-actions/adp-grid-control-actions.module.js' },
        { name: 'adp-grid-print/adp-grid-print-table-builder.service.js' },
        { name: 'adp-grid-print/adp-grid-print.module.js' },
        { name: 'adp-grid-quick-filter/adp-grid-quick-filter.module.js' },
        { name: 'adp-grid-view-manager/adp-grid-view-manager.component.js' },
        { name: 'adp-grid-view-manager/adp-grid-view-manager.controller.js' },
        { name: 'adp-grid-view-manager/adp-grid-view-manager.module.js' },
        { name: 'adp-grid-view-manager/adp-grid-view-manager.service.js' },
        { name: 'adp-otp-config-control/adp-otp-config-control.component.js' },
        { name: 'adp-otp-config-control/adp-otp-config-control.controller.js' },
        { name: 'adp-otp-config-control/adp-otp-config-control.module.js' },
        { name: 'adp-otp-config-control/adp-otp.helper.js' },
        { name: 'adp-otp-config-control/adp-otp-backup-codes.controller.js' },
        { name: 'adp-otp-config-control/adp-otp-backup-codes.component.js' },
        { name: 'adp-rtc-actions/adp-rtc-actions.module.js' },
        { name: 'adp-synthetic-generate/adp-synthetic-generate.component.js' },
        { name: 'adp-synthetic-generate/adp-synthetic-generate.controller.js' },
        { name: 'adp-synthetic-generate/adp-synthetic-generate.module.js' },
        { name: 'adp-webvowl/adp-webvowl.directive.js' },
        { name: 'adp-webvowl/adp-webvowl.module.js' },
        { name: 'default/default.module.js' },
        { name: 'adp-bpm-diagrams/bpm-types/adp-bpmn.config.js' },
        { name: 'adp-bpm-diagrams/bpm-types/adp-bpmn.helper.js' },
        { name: 'adp-bpm-diagrams/bpm-types/adp-dnm.config.js' },
        { name: 'adp-bpm-diagrams/bpm-types/adp-dnm.helper.js' },
        { name: 'adp-filter-builder/adp-filter-builder.component.js' },
        { name: 'adp-filter-builder/adp-filter-builder.controller.js' },
        { name: 'adp-filter-builder/adp-filter-builder.module.js' },
        { name: 'adp-filter-builder/adp-filter-builder.service.js' },
        { name: 'adp-form-actions/adp-form-actions.module.js' },
        { name: 'adp-profile/adp-profile.module.js' },
        { name: 'adp-roles-permissions-editor/adp-roles-permissions-editor.module.js' },
        { name: 'adp-data-export/adp-export-status-modal.component.js' },
        { name: 'adp-data-export/adp-export-status-modal.controller.js' },
      ];

      should(data.length).equal(filesList.length);
      // empty files with 0 size are in app model, default-module.js is in core
      should(data).containDeep(filesList);
    });

    it('Should not show any files in directories out of "/public/js/client-modules"', async function () {
      const dirs = ['/public', '/public/default-thumbnails', '/public/css', '/public/img', '/public/logo'];
      const responses = await Promise.map(dirs, (dir) => resourceRequest(this.appLib).get(dir));
      responses.forEach((res) => {
        const { success, message } = res.body;
        should(success).equal(false);
        should(message).equal('Forbidden to access directory');
      });
    });

    it('Should show single files in /public directory', async function () {
      const res = await resourceRequest(this.appLib).get('/public/manifest.json');
      should(res.statusCode).equal(200);
      should(res.type).equal('application/json');
    });
  });
});
