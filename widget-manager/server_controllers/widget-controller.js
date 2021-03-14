/**
 * Implements endpoints for questionnaire widget
 * @returns {{}}
 */

require('dotenv').load({ path: require('path').join(__dirname, '../.env') });
const _ = require('lodash');
const log = require('log4js').getLogger('widget-manager/widget-controller');
const querystring = require('querystring');
const {
  getNotFoundWidgetHtml,
  getWidgetHtml,
  getFhirData,
  getFhirAuthParams,
  step3ObtainAuthorizationParams,
  extractCodingsForEpicStu3,
  getPreparedWidgetHtmlWithRxcuis,
  getPreparedWidgetHtml,
  kebabCase,
  step1aObtainAuthAndTokenUrls,
  handleAxiosError
} = require('../controller_util/widget');

const ISS = process.env.EPIC_ISS || 'https://apporchard.epic.com/interconnect-aocurprd-oauth/api/FHIR/STU3';
const AUTHORIZE_URL = 'https://apporchard.epic.com/interconnect-aocurprd-oauth/oauth2/authorize';
const TOKEN_URL = `https://apporchard.epic.com/interconnect-aocurprd-oauth/oauth2/token`;
const EPIC_AUTH_FULL_URL = process.env.EPIC_AUTH_FULL_URL || `${process.env.WIDGET_API_URL}/epic/auth`;

const ENV_EPIC_CLIENT_ID_PREFIX = 'EPIC_CLIENT_ID_';
const EPIC_CLIENT_ID_FALLBACK = process.env.EPIC_CLIENT_ID_FALLBACK || 'HealthyCitizenWidgets';

const ISS_COOKIE_NAME = 'iss';
const CLIENT_ID_COOKIE_NAME = 'clientId';
const WIDGET_TYPE_COOKIE_NAME = 'widgetType';
const WIDGET_TYPE_FALLBACK = process.env.WIDGET_TYPE_FALLBACK || 'recalls';
// const AUTHORIZE_URL_COOKIE_NAME = 'authorize_url';
const TOKEN_URL_COOKIE_NAME = 'token_url';

module.exports = function() {
  const m = {};

  function getLogInfo() {
    if (process.env.DEVELOPMENT === 'true') {
      return msg => log.info(msg);
    }
    return () => {};
  }

  m.logInfo = getLogInfo();

  m.getEnvParamForWidgetType = t => {
    const screamingCaseType = t ? _.snakeCase(t).toUpperCase() : '';
    return `${ENV_EPIC_CLIENT_ID_PREFIX}${screamingCaseType}`;
  };

  m.init = appLib => {
    m.appLib = appLib;

    // for backward compatibility with EPIC
    if (!process.env.EPIC_CLIENT_ID_UCSF_RECALLS) {
      process.env.EPIC_CLIENT_ID_UCSF_RECALLS = EPIC_CLIENT_ID_FALLBACK;
    }

    const widgetTypes = _.keys(_.get(m.appLib.appModel.models, 'widgets.fields.type.list.values'));
    m.validWidgetTypes = widgetTypes.filter(t => process.env[m.getEnvParamForWidgetType(t)]) || [];

    appLib.addRoute('get', `/widgets/:id`, [m.getWidget]);
    appLib.addRoute('get', `/widget-wrapper-1to4`, [m.getWidgetWrapperStepsFrom1To4]);
    appLib.addRoute('get', `/widget-params-step1to4`, [m.getWidgetParamsStepsFrom1To4]);
    appLib.addRoute('get', `/widget-wrapper`, [m.getWidgetWrapperStepsFrom1To10]);
    appLib.addRoute('get', `/widget-wrapper-with-rxcuis`, [m.getWidgetWrapperWithRxcuis]);
    appLib.addRoute('get', `/epic/start/:widgetType`, [m.epicStart]);
    appLib.addRoute('get', `/epic/auth`, [m.epicAuth]);

    // for backward compatibility with EPIC
    appLib.addRoute('get', `/epic/start`, [
      (req, res, next) => {
        _.set(req, 'params.widgetType', WIDGET_TYPE_FALLBACK);
        return m.epicStart.call(null, req, res, next);
      },
    ]);
  };

  m.getWidget = (req, res, next) => {
    const widgetId = req.params.id;
    return m.appLib.db
      .collection('widgets')
      .findOne({ id: widgetId })
      .then(widgetData => {
        if (!widgetData) {
          return res.json({ success: false, data: 'Widget not found' });
        }
        res.json({ success: true, data: widgetData });
      })
      .catch(err => {
        log.log(err.message);
        res.json({ success: false, message: 'Unable to get widget params.' });
      });
  };

  /** More info: https://confluence.conceptant.com/display/DEV/Open+EPIC+FHIR+App+Launch+Protocol#OpenEPICFHIRAppLaunchProtocol-June2019Implementation */
  m.getWidgetWrapperStepsFrom1To4 = (req, res, next) => {
    const widgetId = req.query.id;
    if (!widgetId) {
      return res.send(getNotFoundWidgetHtml());
    }

    return this.appLib.db
      .collection('widgets')
      .findOne({ id: widgetId })
      .lean()
      .then(widgetData => {
        if (!widgetData) {
          throw new Error(`Unable to find widget by id ${widgetId}`);
        }

        return Promise.all([widgetData, getFhirAuthParams(AUTHORIZE_URL, TOKEN_URL, widgetData)]);
      })
      .then(([widgetData, authParams]) => {
        const mergedParams = _.merge({}, widgetData, authParams, req.query);
        const clearedParams = _.omit(mergedParams, [
          '_id',
          'id',
          'creator',
          'createdAt',
          'updatedAt',
          'name',
          'dataSource',
        ]);
        const filteredParams = _.omitBy(clearedParams, val => _.isNil(val) || _.isEmpty(val));

        const params = _.map(filteredParams, (val, key) => [`data-${kebabCase(key)}`, val.toString()]);
        res.send(getWidgetHtml(widgetId, params));
      })
      .catch(err => {
        handleAxiosError(err, log);
        res.send(getNotFoundWidgetHtml());
      });
  };

  m.getWidgetParamsStepsFrom1To4 = (req, res, next) => {
    const widgetId = req.query.id;
    if (!widgetId) {
      return res.send({ success: false, message: 'not found' });
    }

    return this.appLib.db
      .collection('widgets')
      .findOne({ id: widgetId })
      .lean()
      .then(widgetData => {
        if (!widgetData) {
          throw new Error(`Unable to find widget by id ${widgetId}`);
        }

        return Promise.all([widgetData, getFhirAuthParams(AUTHORIZE_URL, TOKEN_URL, widgetData)]);
      })
      .then(([widgetData, authParams]) => {
        const mergedParams = _.merge({}, widgetData, authParams, req.query);
        const clearedParams = _.omit(mergedParams, [
          '_id',
          'id',
          'creator',
          'createdAt',
          'updatedAt',
          'name',
          'dataSource',
        ]);
        const filteredParams = _.omitBy(clearedParams, val => _.isNil(val) || _.isEmpty(val));

        const params = _.transform(filteredParams, (result, val, key) => {
          result[_.camelCase(key)] = val.toString();
        });
        res.json({ success: true, data: params });
      })
      .catch(err => {
        handleAxiosError(err, log);
        res.send(getNotFoundWidgetHtml());
      });
  };

  m.getWidgetWrapperStepsFrom1To10 = (req, res, next) => {
    const widgetId = req.query.id;
    if (!widgetId) {
      return res.send(getNotFoundWidgetHtml());
    }

    return this.appLib.db
      .collection('widgets')
      .findOne({ id: widgetId })
      .lean()
      .then(widgetData => {
        if (!widgetData) {
          throw new Error(`Unable to find widget by id ${widgetId}`);
        }

        return getFhirAuthParams(AUTHORIZE_URL, TOKEN_URL, widgetData);
      })
      .then(({ patient, fhir_access_token }) => {
        res.send(getPreparedWidgetHtml({ iss: ISS, patient, fhir_access_token, widgetType: WIDGET_TYPE_FALLBACK }));
      })
      .catch(err => {
        handleAxiosError(err, log);
        res.send(getNotFoundWidgetHtml());
      });
  };

  m.getWidgetWrapperWithRxcuis = (req, res, next) => {
    const widgetId = req.query.id;
    if (!widgetId) {
      return res.send(getNotFoundWidgetHtml());
    }

    return this.appLib.db
      .collection('widgets')
      .findOne({ id: widgetId })
      .lean()
      .then(widgetData => {
        if (!widgetData) {
          throw new Error(`Unable to find widget by id ${widgetId}`);
        }

        return getFhirAuthParams(AUTHORIZE_URL, TOKEN_URL, widgetData);
      })
      .then(({ patient, fhir_access_token }) => getFhirData(ISS, patient, fhir_access_token))
      .then(fhirData => {
        const rxcuis = extractCodingsForEpicStu3(fhirData);
        res.send(getPreparedWidgetHtmlWithRxcuis(rxcuis));
      })
      .catch(err => {
        handleAxiosError(err, log);
        res.send(getNotFoundWidgetHtml());
      });
  };

  function getCookieOrApplyFallback(req, cookieName, fallbackValue) {
    if (req.cookies[cookieName]) {
      return req.cookies[cookieName];
    }
    m.logInfo(`Cookie with name ${cookieName} is not set, applying fallback: ${cookieName}=${fallbackValue}`);
    return fallbackValue;
  }

  m.epicAuth = (req, res, next) => {
    m.logInfo(`epicAuth req params: ${JSON.stringify(req.query)}, cookies: ${JSON.stringify(req.cookies)}`);
    const { code } = req.query;
    const iss = getCookieOrApplyFallback(req, ISS_COOKIE_NAME, ISS);
    const clientId = getCookieOrApplyFallback(req, CLIENT_ID_COOKIE_NAME, EPIC_CLIENT_ID_FALLBACK);
    const widgetType = getCookieOrApplyFallback(req, WIDGET_TYPE_COOKIE_NAME, WIDGET_TYPE_FALLBACK);
    const tokenUrl = getCookieOrApplyFallback(req, TOKEN_URL_COOKIE_NAME, TOKEN_URL);

    step3ObtainAuthorizationParams(tokenUrl, clientId, code, EPIC_AUTH_FULL_URL)
      .then(({ fhir_access_token, patient }) => {
        m.logInfo(`fhir_access_token=${fhir_access_token}, patient=${patient}`);
        res.send(getPreparedWidgetHtml({ iss, fhir_access_token, patient, widgetType }));
      })
      .catch(err => {
        handleAxiosError(err, log);
        res.send(getNotFoundWidgetHtml());
      });
  };

  function setCookie(res, cookieName, cookieValue) {
    res.cookie(cookieName, cookieValue, {
      sameSite: 'lax',
      secure: true,
    });
  }

  m.epicStart = (req, res, next) => {
    m.logInfo(`epicStart, req: ${req.url}`);
    const { widgetType } = req.params;
    const isValidWidgetName = m.validWidgetTypes.includes(widgetType);
    if (!isValidWidgetName) {
      log.error(`Invalid widget type: ${widgetType}`);
      const supportedWidgetTypesMsg = `Supported widget types: ${m.validWidgetTypes.join(', ')}`;
      const message = widgetType
        ? `Unable to find widget '${widgetType}'. ${supportedWidgetTypesMsg}`
        : `Please specify widget type in URL. ${supportedWidgetTypesMsg}`;
      return res.send(getNotFoundWidgetHtml(message));
    }

    const clientId = process.env[m.getEnvParamForWidgetType(widgetType)];
    let { launch, iss } = req.query;
    if (!launch || !iss) {
      return res.send(getNotFoundWidgetHtml(`Params 'launch' and 'iss' must be specified in request.`));
    }
    iss = iss.replace('DSTU2', 'STU3'); // workaround for a bug that EPIC has according to UCSF (reporting DSTU2 ISS even when STU3 is selected)

    step1aObtainAuthAndTokenUrls(iss)
      .then(({ authorizeUrl, tokenUrl }) => {
        setCookie(res, ISS_COOKIE_NAME, iss);
        setCookie(res, WIDGET_TYPE_COOKIE_NAME, widgetType);
        setCookie(res, CLIENT_ID_COOKIE_NAME, clientId);
        // setCookie(res, AUTHORIZE_URL_COOKIE_NAME, authorizeUrl);
        setCookie(res, TOKEN_URL_COOKIE_NAME, tokenUrl);
        m.logInfo(
          `Set cookies ${ISS_COOKIE_NAME}=${iss}, ${WIDGET_TYPE_COOKIE_NAME}=${widgetType}, ${CLIENT_ID_COOKIE_NAME}=${clientId} , ${TOKEN_URL_COOKIE_NAME}=${tokenUrl}`
        );

        const authParams = querystring.stringify({
          response_type: 'code',
          client_id: clientId,
          launch,
          state: 'test',
          redirect_uri: EPIC_AUTH_FULL_URL,
          scope: 'launch',
        });
        const authroizeRedirectUrl = `${authorizeUrl}?${authParams}`;
        log.info(`Redirecting to ${authroizeRedirectUrl}`);
        res.redirect(302, authroizeRedirectUrl);
      })
      .catch(err => {
        handleAxiosError(err, log);
        res.send(getNotFoundWidgetHtml());
      });
  };

  return m;
};
