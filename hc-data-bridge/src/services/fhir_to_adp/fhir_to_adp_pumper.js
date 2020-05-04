const _ = require('lodash');
const Promise = require('bluebird');

const SearchParamsParser = require('../gen_app_model_by_fhir/search_params_mapper');
const { getAxiosProxySettings } = require('../util/proxy');
// eslint-disable-next-line import/order
const axios = require('axios').create(getAxiosProxySettings());

const FHIR_URL_PREFIX = '/fhir';

class FhirToAdpPumper {
  constructor (rows) {
    this.rows = rows;
    const searchParamsMapper = new SearchParamsParser();
    this.profilesResources = searchParamsMapper.parse();
  }

  pump () {
    return Promise.mapSeries(this.rows, (row) => {
      const fhirToAdpRowPumper = new FhirToAdpRowPumper(row, this.profilesResources);
      return fhirToAdpRowPumper.pump()
        .then(() => console.log(`---- Finished pumping for user '${row.login}'`));
    });
  }
}

class FhirToAdpRowPumper {
  constructor (row, profilesResources) {
    this.src = row.src;
    this.dest = row.dest;
    this.fhirDest = this.dest.endsWith(FHIR_URL_PREFIX) ? this.dest : `${this.dest}${FHIR_URL_PREFIX}`;
    this.srcFhirId = row.srcFhirId;
    this.login = row.login;
    this.password = row.password;
    this.email = row.email;
    this.profilesResources = profilesResources;
  }

  pump () {
    return this._prepareAppModelsData()
      .then(() => this._pumpUser());
  }

  _loginAdpUser (tryNum = 1) {
    return axios.post(`${this.dest}/login`, {
      login: this.login,
      password: this.password,
    })
      .then((loginRes) => {
        console.log(`Successful login with user: ${this.login}`);
        return loginRes.data;
      })
      .catch((err) => {
        tryNum > 1 && console.log(`Failed login with user: ${this.login}. Response: ${err.response.data}`);
      });
  }

  _signupAdpUser () {
    const signupData = {
      login: this.login,
      password: this.password,
      email: this.email,
    };
    return axios.post(`${this.dest}/signup`, signupData)
      .then((signupRes) => {
        console.log(`Successful signup with user: ${signupData.login}`);
        return signupRes.data;
      })
      .catch((err) => {
        console.log(`Failed signup with data: ${JSON.stringify(signupData)}`);
      });
  }

  _loginOrCreateAdpUser () {
    return this._loginAdpUser()
      .then((loginData) => {
        if (loginData) {
          return loginData;
        }
        return this._signupAdpUser()
          .then((signupData) => {
            if (signupData) {
              return this._loginAdpUser(2);
            }
          });
      });
  }

  _upsertPatientRelatedData (allPatientRelatedData, loginData) {
    const { token } = loginData;
    if (!token) {
      console.log(`Invalid login data: ${loginData}`);
      return Promise.resolve();
    }

    const resources = allPatientRelatedData.entry.map(entry => entry.resource);
    // generate mongo id for creating LookupObjectID
    // _.forEach(resources, (resource) => { resource._id = new ObjectID(); });

    return Promise.map(resources, (resource) => {
      const schemeName = _.camelCase(resource.resourceType);

      // transform refs to LookupObjectID format in patient resources
      // const resInfo = this.profilesResources[resource.resourceType];

      const lookupFields = _(_.get(this.appModels, `${schemeName}.fields`))
        .map((val, key) => { if (val.type === 'LookupObjectID') return key; })
        .compact().value();

      _.forEach(lookupFields, (lookupField) => {
        // cut scheme name
        // const incFieldName = fullIncFieldName.replace(/.+?\./, '');

        // Procedure.patient expression is:
        // "ReferralRequest.subject | DocumentManifest.subject | Goal.subject | Consent.patient | DocumentReference.subject | ImagingManifest.patient | RiskAssessment.subject | CareTeam.subject | ImagingStudy.patient | FamilyMemberHistory.patient | Encounter.subject | DeviceUseStatement.subject | DeviceRequest.subject | AllergyIntolerance.patient | CarePlan.subject | EpisodeOfCare.patient | Procedure.subject | List.subject | Immunization.patient | VisionPrescription.patient | ProcedureRequest.subject | Flag.subject | Observation.subject | DiagnosticReport.subject | NutritionOrder.patient | Condition.subject | Composition.subject | DetectedIssue.patient | SupplyDelivery.patient | ClinicalImpression.subject"
        // so it should figure out only 'Procedure.subject' and as result extract field 'subject'
        // const modelFieldName = resInfo.searchParam[incFieldName].info.expression.split(' | ')[0].replace(/.+?\./, '');

        // TODO: transform search fields like 'general-practitioner' to field name in schema 'generalPractitioner'
        const reference = _.get(resource, `${lookupField}.reference`);
        if (reference) {
          const [fhirRefScheme, refId] = reference.split('/');

          const table = _.camelCase(fhirRefScheme);
          const tableLookup = _.get(this.appModels, `${schemeName}.fields.${lookupField}.lookup.table.${table}`);
          // always set fhir_id as _id
          const foreignKey = refId;

          const refResource = resources.find(r => r.resourceType === fhirRefScheme && r.id === refId);
          const labelField = _.get(tableLookup, `label`);
          const label = _.get(refResource, labelField, '');

          resource[lookupField] = { foreignKey, table, label };
        }
      });

      const resourceDescription = `'${schemeName}' resource with fhir_id:'${resource.id}' for login:'${loginData.user.login}'`;
      return axios.put(`${this.fhirDest}/${schemeName}?_id=${resource.id}`, { data: resource }, { headers: { Authorization: `JWT ${token}` } })
        .then((res) => {
          console.log(`Successfully upserted ${resourceDescription}`);
        })
        .catch(err => console.log(`Failed while upserting ${resourceDescription}: ${err.message} ${JSON.stringify(err.response.data)}`));
    });
  }

  _prepareAppModelsData () {
    return axios.get(`${this.dest}/app-model`)
      .then((appModelResp) => {
        this.appModels = appModelResp.data.data.models;

        const modelNames = new Set(Object.keys(this.appModels).map(n => _.upperFirst(n)));
        this.revIncludeParams = this.profilesResources.Patient.searchRevInclude
          .filter(ri => modelNames.has(ri.split('.')[0]))
          .map(ri => `_revinclude=${ri.replace('.', ':')}`)
          .join('&');
        this.includeParams = this.profilesResources.Patient.searchInclude
          .filter(ri => modelNames.has(ri.split('.')[0]))
          .map(ri => `_include=${ri.replace('.', ':')}`)
          .join('&');
      });
  }

  _pumpUser () {
    return Promise.all([
      this._getPatientDataFromFhir(),
      this._loginOrCreateAdpUser(),
    ])
      .then(([patientDataRes, loginRes]) => this._upsertPatientRelatedData(patientDataRes.data, loginRes.data));
  }

  _getPatientDataFromFhir () {
    const allPatientDataUrl = `${this.src}/Patient?_id=${this.srcFhirId}&${this.includeParams}&${this.revIncludeParams}&_format=json`;
    return axios.get(allPatientDataUrl);
  }
}

module.exports = FhirToAdpPumper;
