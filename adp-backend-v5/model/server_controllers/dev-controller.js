const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const { getDiagramCode } = require('../../lib/dev-helpers/er-diagram');
const { getSchemeInCsv } = require('../../lib/dev-helpers/data-dictionary');

module.exports = () => {
  const m = {};

  m.init = async (appLib) => {
    if (process.env.DEVELOPMENT !== 'true') {
      return;
    }

    m.appLib = appLib;
    m.nomnomlTemplate = await fs.readFile(path.join(__dirname, '../public/nomnoml/index.html'), 'utf8');
    m.devPagePath = path.join(__dirname, '../../lib/dev-helpers/dev-page.html');

    appLib.addRoute('get', `/er-diagram`, [
      // appLib.isAuthenticated,
      m.getErDiagram,
    ]);
    appLib.addRoute('get', `/data-dictionary`, [
      // appLib.isAuthenticated,
      m.getDataDictionary,
    ]);

    appLib.addRoute('get', `/dev`, [
      // appLib.isAuthenticated,
      m.getDevPage,
    ]);
  };

  m.getErDiagram = (req, res) => {
    const { appModel, appModelHelpers } = m.appLib;
    const appTitle = _.get(appModel, 'interface.app.title', 'ER Diagram');
    const diagramCode = getDiagramCode(appModel.models, appModelHelpers.Lists, appTitle);
    const htmlWithDiagram = m.nomnomlTemplate.replace('{DIAGRAM_CODE}', diagramCode);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write(htmlWithDiagram);
    res.end();
  };

  m.getDataDictionary = async (req, res) => {
    const schemeInCsv = await getSchemeInCsv(m.appLib.appModel.models);
    res.writeHead(200, { 'Content-Type': 'text/csv' });
    res.write(schemeInCsv);
    res.end();
  };

  m.getDevPage = async (req, res) => {
    res.sendFile(m.devPagePath);
  };

  return m;
};
