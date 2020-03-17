const _ = require('lodash');
const axios = require('axios');
const urlParse = require('url-parse');
const querystring = require('querystring');
const { Base64 } = require('js-base64');

const REDIRECT_URL_1 = 'https://localhost';
const REDIRECT_URL_2 = 'https://localhost';

function getPreparedWidgetHtml({ iss, fhir_access_token, patient, widgetType }) {
  return `
      <!doctype html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta
          name="viewport"
          content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title>Document</title>
      </head>
      <body>
       
      <script
      id="hc-widget-body"
      data-wm="false"
      data-type="${widgetType}"
      data-data-source="epicStu3WithOauth2"
      data-epic-patient-stu3="${patient}"
      data-epic-access-token="${fhir_access_token}"
      data-fhir-server-url="${iss}"
      src="${process.env.HC_WIDGET_BASE_URL}/hc-widget.js"
      >
      </script>
      
      </body>
      </html>`;
}

function extractCodingsForEpicStu3(res) {
  const result = [];

  res.entry.forEach(entry => {
    const codings = _.get(entry, 'resource.code.coding', null);
    if (codings === null) {
      return;
    }
    const rxcuis = codings
      .map(({ system, code }) => {
        if (system === 'http://www.nlm.nih.gov/research/umls/rxnorm') {
          return code;
        }
      })
      .filter(item => item);
    result.push(rxcuis);
  });

  return _.flatten(result);
}

function getPreparedWidgetHtmlWithRxcuis(rxcuis) {
  return `
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta
        name="viewport"
        content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="ie=edge">
      <title>Document</title>
    </head>
    <body>
       
    <script
      id="hc-widget-body"
      data-data-source="inline"
      data-drugs="${rxcuis.join(',')}"
      data-wm="false"
      data-type="ucsfRecalls"
      src="${process.env.HC_WIDGET_BASE_URL}/hc-widget.js"
      >
    </script>
      
    </body>
    </html>`;
}

function getFhirData(iss, patientStu3, accessToken) {
  return axios
    .get(`${iss}/MedicationRequest?patient=${patientStu3}&_include=MedicationRequest:medication`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    })
    .then(res => res.data);
}

function getFhirAuthParamsWithLaunchCode(authorizeUrl, tokenUrl, epicClientId, launchCode) {
  return step2ObtainAuthorizationCode(authorizeUrl, epicClientId, launchCode).then(authorizationCode =>
    step3ObtainAuthorizationParams(tokenUrl, epicClientId, authorizationCode)
  );
}

function getFhirAuthParamsWithBasicAuth(authorizeUrl, tokenUrl, epicClientId, basicAuthLogin, basicAuthPassword) {
  const basicAuth = Base64.encode(`${basicAuthLogin}:${basicAuthPassword}`);
  return step1ObtainLaunchCode(epicClientId, basicAuth).then(launchCode =>
    getFhirAuthParamsWithLaunchCode(authorizeUrl, tokenUrl, epicClientId, launchCode)
  );
}

function getFhirAuthParams(authorizeUrl, tokenUrl, widgetData) {
  const {
    dataSource,
    // epicStu3WithOauth2AndLaunchCodeAuth, // true/false
    epicStu3WithOauth2AndLaunchCodeAuthLogin: basicAuthLogin,
    epicStu3WithOauth2AndLaunchCodeAuthPassword: basicAuthPassword,
    epicClientId,
    epicLaunchCode,
  } = widgetData;
  if (dataSource === 'epicStu3WithOauth2AndLaunchCode') {
    return getFhirAuthParamsWithBasicAuth(authorizeUrl, tokenUrl, epicClientId, basicAuthLogin, basicAuthPassword);
  }
  if (dataSource === 'epicStu3WithOauth2') {
    return getFhirAuthParamsWithLaunchCode(authorizeUrl, tokenUrl, epicClientId, epicLaunchCode);
  }
  throw new Error(`Invalid widget data source: ${dataSource}.`);
}

function kebabCase(word) {
  return _.words(word)
    .reduce((acc, val) => {
      const valAsNumber = parseInt(val, 10);

      if (_.isNaN(valAsNumber)) {
        acc.push(val);
      } else {
        acc[acc.length - 1] = _.last(acc) + val;
      }

      return acc;
    }, [])
    .join('-');
}

function getNotFoundWidgetHtml(text = 'Unable to get widget') {
  return `
      <!doctype html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta
          name="viewport"
          content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title>Widget not found</title>
      </head>
      <body>
          <h1 class="title">${text}</h1>
      </body>
      </html>`;
}

function getWidgetHtml(widgetId, widgetParams) {
  return `
      <!doctype html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta
          name="viewport"
          content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title>Document</title>
      </head>
      <body>
      
      <script
      id="hc-widget-body"
      data-wm="false"
      data-data-source="epicStu3"
      ${widgetParams.map(([key, val]) => `${key}=${val}`).join('\n')}
      src="${process.env.HC_WIDGET_BASE_URL}/hc-widget.js"
      >
      </script>
      
      </body>
      </html>`;
}

function step1ObtainLaunchCode(clientId, basicAuth) {
  return axios({
    url: `https://dev-unified-api.ucsf.edu/clinical/apex/api/UCSF/2015/OAuth/Token/LaunchCode/launchcode?clientID=${clientId}&userID=1&userINI=WPR`,
    method: 'post',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
    },
    data: {},
  }).then(res => res.data.token);
}

function step2ObtainAuthorizationCode(authorizeUrl, clientId, launchCode, redirectUrl1 = 'https://localhost') {
  return axios
    .get(authorizeUrl, {
      params: {
        response_type: 'code',
        client_id: clientId,
        launch: launchCode,
        state: 'test',
        redirect_uri: redirectUrl1,
        scope: 'launch',
      },
      maxRedirects: 1,
    })
    .then(res => {
      throw new Error(`Should fail on redirect with 'code' param in redirect url but succeed.`);
    })
    .catch(error => {
      if (!error.request) {
        throw new Error(error);
      }
      const { query } = urlParse(error.request._currentUrl, true);

      if (query.error) {
        throw new Error(
          `Error while obtaining auth code by cliendId='${clientId}', launchCode='${launchCode}'. From response: error='${
            query.error
          }', description='${query.error_description}'`
        );
      }

      return query.code;
    });
}

function step3ObtainAuthorizationParams(tokenUrl, clientId, authorizationCode, redirectUrl = 'https://localhost') {
  const params = querystring.stringify({
    grant_type: 'authorization_code',
    client_id: clientId,
    code: authorizationCode,
    redirect_uri: redirectUrl,
  });
  console.log(`Request POST for ${tokenUrl} with params ${params}`);
  return axios.post(tokenUrl, params).then(res => ({
    fhir_access_token: res.data.access_token,
    patient: res.data.patient,
  }));
}

function step1aObtainAuthAndTokenUrls(iss) {
  return axios
    .get(`${iss}/metadata`, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    })
    .then(res => {
      const { data } = res;
      if (data.resourceType !== 'CapabilityStatement') {
        throw new Error(
          `Invalid resourceType retrieved. It shall be 'CapabilityStatement'. Whole data from iss: ${JSON.stringify(
            data
          )}`
        );
      }

      const extensions = _.get(data, 'rest.0.security.extension', []);
      // more: http://www.hl7.org/fhir/smart-app-launch/StructureDefinition-oauth-uris.html
      const oauthUrisExtensionUrl = 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris';
      const oauthUrisExtension = extensions.find(e => e.url === oauthUrisExtensionUrl);
      if (!oauthUrisExtension) {
        throw new Error(`Unable to find extension with url '${oauthUrisExtensionUrl}'`);
      }

      const { authorize, token } = _.reduce(
        oauthUrisExtension.extension,
        (r, val) => {
          r[val.url] = val.valueUri;
          return r;
        },
        {}
      );
      if (!authorize || !token) {
        throw new Error(`Both 'authorize' and 'token' urls shall be specified in extension '${oauthUrisExtensionUrl}'`);
      }

      return { authorizeUrl: authorize, tokenUrl: token };
    });
}

module.exports = {
  getPreparedWidgetHtml,
  extractCodingsForEpicStu3,
  getPreparedWidgetHtmlWithRxcuis,
  getFhirData,
  getFhirAuthParams,
  getNotFoundWidgetHtml,
  getWidgetHtml,
  step3ObtainAuthorizationParams,
  kebabCase,
  step1aObtainAuthAndTokenUrls,
};
