import 'babel-polyfill'
import 'whatwg-fetch'

import {AdpForceGraphHelpers} from '../../public/js/client-modules/adp-force-graph/adp-force-graph.helpers.js';
import {ForceGraphControllerLogic} from '../../public/js/client-modules/adp-force-graph/adp-force-graph-3d.logic';

import * as Ui from 'common/template-ui-service.js';
import {tagBox} from 'common/tag-box-control.js'

import {notificationService, interval, timeout, http, sce} from 'common/fakeInterfaces';

// All same imports used for our regular 3d-vis library
import '../force-graph/force-graph'
import 'font-awesome/css/font-awesome.min.css'
import 'common/styles/standalone-styles.less'
import './styles/gsrs3d.less'

(function main() {
  const urlUuidParamRegRes = new RegExp('[\?&]uuid=([^&#]*)').exec(window.location.href);
  const uuid = urlUuidParamRegRes ? decodeURIComponent(urlUuidParamRegRes[1]) : '';
  const context = {};
  const interfaceParams = {
    nodeInfoAddInfo: node =>
      (
        node.id ?
          [
            '<div id="fg3d-info-box-details-url">',
            `<a href="?uuid=${node.id}">Visualize this substance connections</a>`,
            '</div>'
          ].join('') : ''
      ) +
      (
        GSRS_WEBSITE_BASE_URI && node.id ?
          [
            '<div id="fg3d-info-box-details-url">',
            `<a href="${GSRS_WEBSITE_BASE_URI}${node.id}" target="_blank">View details on the GSRS website</a>`,
            '</div>'
          ].join('') : ''
      )
  }

  Ui.bindUiHandlers(context, interfaceParams);

  silentJsonFetch(DEFAULT_CONFIG_FILE)
    .then(json => {
      const initialSetup = json.initialSetup || {};

      hideUnusedControls(initialSetup);

      ForceGraphControllerLogic.call(context,
        Ui.getInterfaceUpdater(interfaceParams),
        null,
        {},
        interval,
        timeout,
        http,
        sce,
        $(window.document),
        notificationService,
        null, // AdpClientCommonHelper (used to load css+scripts of libs) is not required since all JS bundled by webpack
        AdpForceGraphHelpers,
        null,
        {
          apiUrl: '',
          'ALLOW_PERFORMANCE_MONITOR': ALLOW_PERFORMANCE_MONITOR,
        },
        tagBox,
        doLoadData,
        doLoadConfig,
        initialSetup
      );
    })

  function doLoadData() {
    return Promise.all([
        silentJsonFetch(STYLES_FILE),
        silentJsonFetch(DEFAULT_STYLES_FILE),
        fetchJsonFile(`${JSON_DATA_FILE_PATH}${uuid}.json`)
      ]
    )
      .then(jsons => {
        const fullData = Object.assign({}, jsons[0], jsons[1], jsons[2]);
        const processedData = AdpForceGraphHelpers.prepareGraphData(fullData,
          BUILD_LEGEND_DYNAMICALLY === 'true', MERGE_SIMILAR_LEGEND_ITEMS === 'true');

        Ui.renderLegend(processedData.legend || {});

        const rootElement = _.find(processedData.nodes, x => x.id === uuid);

        if (rootElement) {
          rootElement.isSelected = true;
        }

        return processedData;
      })
      .catch(err => {
        Ui.reportFatalError(err);
        throw err;
      })
  }

  function doLoadConfig() {
    return silentJsonFetch(DEFAULT_CONFIG_FILE).then(json => json.initialConfig || {})
  }

  function hideUnusedControls(initialSetup) {
    if (initialSetup.supportParticles === false) {
      hideFormRow('#fg3d-showParticles');
      hideFormRow('#fg3d-particleSize');
    }
  }

  function hideFormRow(selector) {
    $(selector).closest('.form-row').remove();
  }

  function silentJsonFetch(url) {
    if (url) {
      return fetch(url)
        .then(xhr => {
          if (xhr.ok) {
            return xhr.json().catch(err => {
              throw new Error(`${url}: ${err}`);
            });
          } else {
            return {};
          }
        })
    } else {
      return Promise.resolve({})
    }
  }

  function fetchJsonFile(url) {
    return fetch(url)
      .then(xhr => {
          if (xhr.ok) {
            return xhr.json()
          } else {
            const statusText = xhr.status === 404 ?
              'The visualization requested is unavailable at this time. Please try again later.' :
              xhr.statusText;

            throw statusText;
          }
        }
      );
  }
})();

