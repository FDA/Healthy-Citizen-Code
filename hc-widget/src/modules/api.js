import lodashGet from 'lodash.get';
import lodashMap from 'lodash.map';
import { HttpError } from './errors';
import {find} from '../lib/utils';
import CONFIG from '../../config.json';
import { drugInfoPredictiveSearch, prefrencesQuery, recallByProductDescriptionQuery} from './queries';

const NDC_SYSTEM = 'http://hl7.org/fhir/sid/ndc';
const RXCUI_SYSTEM = 'http://www.nlm.nih.gov/research/umls/rxnorm';

const hcWidgetAPI = {
  getQuestionnaireByFhirId,
  getFhirValues,
  getDrugInteractions,
  getWidgetParams,
  getAdverseEvents,
  getAdverseEventsAlt,
  getRecalls,
  getMedicationCodings,
  findInteractionsByRxcuis,
  getMedicationGenericName,
  getRxcuiByNdc,
  startQuestionnaire,
  updateQuestionnaire,
  getRxClass,
  getDrugInfoByPredicitiveMatch,
  getDrugInfoByPredicitiveMatchGraphQl,
  getDrugInfoById,
};
export default hcWidgetAPI;

function getWidgetParams (widgetId) {
  const endpoint = `${CONFIG.widgetApiUrl}/widgets/${widgetId}`;

  return fetch(endpoint)
    .then(res => res.json())
    .then(json => {
      if (json.success) {
        return json.data;
      } else {
        throw new Error('Unable to load widget params');
      }
    });
}

function startQuestionnaire (params, questionnaireId) {
  const endpoint = CONFIG.hcResearchUrl + '/start-questionnaire/' + params.fhirId;

  const options = {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({data: {questionnaireId: questionnaireId}}),
  };

  return fetch(endpoint, options)
    .then(res => res.json())
    .then(json => {
      if (json.success) {
        return json.data;
      } else {
        throw new Error('Unable to start the questionnaire.');
      }
    });
}

function updateQuestionnaire (params, data, isCompleted) {
  const endpoint = CONFIG.hcResearchUrl + '/questionnaire-by-fhirid/' + params.fhirId;

  const options = {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      data: {
        questionnaireId: params.questionnaireId,
        answers: data,
        isCompleted: isCompleted,
      },
    }),
  };

  return fetch(endpoint, options)
    .then(res => res.json())
    .then(json => {
      if (json.success) {
        return json;
      } else {
        throw new Error('Unable to start the questionnaire.');
      }
    });
}

function getQuestionnaireByFhirId (fhirId) {
  return fetch(CONFIG.hcResearchUrl + '/questionnaire-by-fhirid/' + fhirId)
    .then(res => res.json())
    .then(json => {
      if (json.success === true && json.data) {
        return json.data;
      } else {
        throw new Error('No questionnaire found');
      }
    })
    .then(data => {
      const questionnaire = data.questionnaireDefinition.questionnaire;
      const questions = lodashMap(questionnaire, (question, key) => {
        question.fieldName = key;
        return question;
      });

      return {
        _id: data._id,
        status: data.status,
        questions: questions,
      };
    });
}

function getFhirValues ({questions, fhirDataUrl, fhirId}) {
  const doRequest = (question) => {
    let fhirFieldPath = lodashGet(question, 'fhirFieldPath');
    let fhirResourceUrl = lodashGet(question, 'fhirResource');

    if (!fhirResourceUrl) {
      question.value = '';
      return Promise.resolve(question);
    }

    fhirResourceUrl = fhirResourceUrl.replace(':id', fhirId);

    return fetch(fhirDataUrl + fhirResourceUrl)
      .then(res => {
        if (res.status !== 200) {
          return false;
        }
        return res.json();
      })
      .then(json => {
        let value = lodashGet(json, fhirFieldPath);
        question.value = value || '';
        return question;
      });
  };

  return Promise.all(questions.map(doRequest));
}

function getDrugInteractions (options) {
  return getMedicationCodings(options)
    .then(medCodings => {
      const rxcuiPromises = medCodings.map(getRxcuiByNdc);

      return Promise.all(rxcuiPromises);
    })
    .then((medCodings) => {
      const allRxcuis = medCodings.map(medCoding => medCoding.rxcui);
      return findInteractionsByRxcuis(allRxcuis);
    })
    .then((interactionsData) => {
      const results = [];
      // Get drug interaction info
      const fullInteractionTypeGroup = lodashGet(interactionsData, 'fullInteractionTypeGroup', []);

      // TODO: find a better way for nested forEach without lodash
      fullInteractionTypeGroup.forEach(group => {
        group.fullInteractionType.forEach(interactionType => {
          interactionType.interactionPair.forEach(interactionPair => {
            const firstDrug = lodashGet(interactionPair, 'interactionConcept.0.minConceptItem.name', '');
            const secondDrug = lodashGet(interactionPair, 'interactionConcept.1.minConceptItem.name', '');

            results.push({
              interactionDrugs: `${firstDrug}, ${secondDrug}`,
              severity: interactionPair.severity,
              description: interactionPair.description,
            });
          });
        });
      });
      const count = results.length;
      const list = results;
      return {
        list,
        count,
      };
    })
    .catch(err => {
      return {
        list: [],
        count: 0,
      };
    });
}

function getMedicationCodingsFromRequestsOrOrders (json) {
  const entries = lodashGet(json, 'entry', []);
  const supportedResourceTypes = ['MedicationRequest', 'MedicationOrder'];
  const medicationCodings = entries
    .map(entry => {
      const resType = lodashGet(entry, 'resource.resourceType');
      if (!supportedResourceTypes.includes(resType)) {
        return null;
      }
      const medCodConcept = lodashGet(entry, 'resource.medicationCodeableConcept');
      const isNdcSystem = lodashGet(medCodConcept, 'coding.0.system') === NDC_SYSTEM;
      if (!isNdcSystem) {
        return null;
      }
      return medCodConcept.coding[0];
    })
    .filter(medicationCoding => medicationCoding);

  return medicationCodings;
}

function getMedicationCodingsFromUserPreferences (udid) {
  return prefrencesQuery({udid})
    .then(data => {
      const medications = data.medications || [];
      const medCodings = medications.map(m => ({
        system: NDC_SYSTEM,
        code: m.ndc11,
        display: m.brandName,
        rxcui: [m.rxcui],
      }));
      return medCodings;
    });
}

function getMedicationCodings (options) {
  let {dataSource, fhirId} = options;
  if (!dataSource) {
    dataSource = 'stu3';
    // throw new Error(`'dataSource' param must be specified to get medications from fhir`);
  }

  if (dataSource === 'stu3') {
    // support path 'options.fhirDataUrl' for widgets not using dataSource
    const fhirDataUrl = options.stu3Url || options.fhirDataUrl;
    if (!fhirDataUrl) {
      throw new Error(`One of params 'stu3Url', 'fhirDataUrl' is required for '${dataSource}' dataSource`);
    }
    return getMedicationCodingsFromFhirStu3(fhirDataUrl, fhirId);
  } else if (dataSource === 'dstu2') {
    const fhirDataUrl = options.dstu2Url;
    if (!fhirDataUrl || !fhirId) {
      throw new Error(`Params 'dstu2Url' and 'fhirId' are required for '${dataSource}' dataSource`);
    }
    return getMedicationCodingsFromDstu2(fhirDataUrl, fhirId);
  } else if (dataSource === 'userPreferences') {
    const {udid} = options;
    if (!udid) {
      throw new Error(`Param 'udid' is required for '${dataSource}' dataSource`);
    }
    return getMedicationCodingsFromUserPreferences(udid);
  }
}

function getMedicationCodingsFromFhirStu3 (fhirDataUrl, fhirId) {
  // Example: http://test.fhir.org/r3/Patient?_id=pat1&_revinclude=MedicationRequest:subject&_format=json
  // https://sb-fhir-stu3.smarthealthit.org/smartstu3/open/Patient?_id=aa27c71e-30c8-4ceb-8c1c-5641e066c0aa&_revinclude=MedicationRequest:subject&_format=json
  const fhirUrl = `${fhirDataUrl}/Patient?_id=${fhirId}&_revinclude=MedicationRequest:subject&_format=json`;

  return fetch(fhirUrl)
    .then(res => {
      if (res.status !== 200) {
        return false;
      }
      return res.json();
    })
    .then(json => {
      return getMedicationCodingsFromRequestsOrOrders(json);
    })
    .catch(err => []);
}

function getMedicationCodingsFromDstu2 (fhirDataUrl, fhirId) {
  if (!fhirDataUrl || !fhirId) {
    return;
  }
  const options = {
    headers: {Accept: 'application/json'},
  };
  // const getPatient = fetch(`${fhirDataUrl}/Patient/${fhirId}`, options)
  //   .then(res => res.json());
  const getMedicationOrders = fetch(`${fhirDataUrl}/MedicationOrder?patient=${fhirId}`, options)
    .then(res => {
      if (res.ok) {
        return res.json();
      } else {
        console.log(`Unable to get medication order ${res.statusText}`);
          throw new HttpError('Unable to get data from fhir server. Please check FHIR Server URL and FHIR id correctness.');
      }
    });

  const getMedicationCodings = getMedicationOrders
    .then(medOrderResp => {
      const medicationCodingsFromOrders = getMedicationCodingsFromRequestsOrOrders(medOrderResp);

      const medicationReferences = medOrderResp.entry
        .map(e => lodashGet(e, 'resource.medicationReference.reference'))
        .filter(r => r);

      const medicationPromises = medicationReferences.map(r => {
        return fetch(r, options)
          .then(res => res.json())
          .catch(err => {
            console.log(err);
            return {};
          });
      });

      const medications = Promise.all(medicationPromises);
      return Promise.all([medicationCodingsFromOrders, medications]);
    })
    .then(([medicationCodingsFromOrders, medications]) => {
      const medicationCodingsFromMedications = medications.map(m => {
        const coding = lodashGet(m, 'code.coding.0');
        if (!coding) {
          return null;
        }
        const system = coding.system;
        if (system === RXCUI_SYSTEM) {
          // maintain compatibility with getRxcuiByNdc format
          coding.rxcui = [coding.code];
          return coding;
        } else if (system === NDC_SYSTEM) {
          return coding;
        }
        return null;
      }).filter(coding => coding);

      const uniqCodingsMap = {};
      medicationCodingsFromMedications.concat(medicationCodingsFromOrders).forEach(coding => {
        const key = coding.code + coding.system;
        if (!uniqCodingsMap[key]) {
          uniqCodingsMap[key] = coding;
        }
      });
      return Object.values(uniqCodingsMap);
    });

  return getMedicationCodings;
}

function getMedicationCodingsFromFhirDstu2RevInclude (fhirDataUrl, fhirId) {
  // Example: http://fhirtest.uhn.ca/baseDstu2/Patient?_id=aa27c71e-30c8-4ceb-8c1c-5641e066c0aa&_revinclude=MedicationOrder:patient&_format=json
  if (!fhirDataUrl || !fhirId) {
    return;
  }
  const fhirUrl = `${fhirDataUrl}/Patient?_id=${fhirId}&_revinclude=MedicationOrder:patient&_format=json`;

  return fetch(fhirUrl)
    .then(res => {
      if (res.status !== 200) {
        return false;
      }
      return res.json();
    })
    .then(json => {
      return getMedicationCodingsFromRequestsOrOrders(json);
    })
    .catch(err => []);
}

function getAdverseEvents (options) {
  return getMedicationCodings(options)
    .then(medCodings => {
      const rxcuiPromises = medCodings.map(getRxcuiByNdc);
      return Promise.all(rxcuiPromises);
    })
    .then(medCodings => {
      const promises = medCodings.reduce((result, item) => {
        if (item.rxcui.length) {
          result.push(getAdverseEventsByRxcui(item, options.patientData));
        }

        return result;
      }, []);
      return Promise.all(promises);
    });
}

function getAdverseEventsAlt (options) {
  return getMedicationCodings(options)
    .then(medCodings => {
      const rxcuiPromises = medCodings.map(getRxcuiByNdc);
      return Promise.all(rxcuiPromises);
    })
    .then(medCodings => {
      const promises = medCodings.reduce((result, item) => {
        if (item.rxcui.length) {
          result.push(getAdverseEventsByRxcuiAlt(item, options.patientData));
        }

        return result;
      }, []);
      return Promise.all(promises);
    });
}

function getRecalls (options) {
  return getMedicationCodings(options)
    .then(medCodings => {
      const rxcuiPromises = medCodings.map(getRxcuiByNdc);
      return Promise.all(rxcuiPromises);
    })
    .then(medCodings => {
      const promises = medCodings.reduce((result, item) => {
        if (item.rxcui.length) {
          result.push(getMedicationDetails(item));
        }

        return result;
      }, []);

      return Promise.all(promises);
    })
    .then(medCodings => {
      const promises = medCodings.map(medCoding => recallByProductDescriptionQuery(medCoding.name)
        .then(res => {
          const list = res.recalls.items.map(r => r.rawData);
          return {
            list,
            display: medCoding.display,
            total: res.recalls.pageInfo.itemCount };
        }));
      return Promise.all(promises);
    });
}

function getRxcuiByNdc (medCoding) {
  if (medCoding.rxcui) {
    return Promise.resolve(medCoding);
  }

  let ndc = medCoding.code;

  return fetch(`https://rxnav.nlm.nih.gov/REST/rxcui.json?idtype=NDC&id=${ndc}`)
    .then(res => {
      if (res.status !== 200) {
        throw 'Invalid response';
      }
      return res.json();
    })
    .then(json => {
      medCoding.rxcui = lodashGet(json, 'idGroup.rxnormId', []);
      return medCoding;
    })
    .catch((err) => []);
}

function getMedicationGenericName (rxcui) {
  const endpoint = `https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui}/allrelated.json`;

  return fetch(endpoint)
    .then(res => {
      if (res.status !== 200) {
        throw 'Invalid response';
      }
      return res.json();
    })
    .then(json => {
      let conceptGroup = json.allRelatedGroup.conceptGroup;
      let nameConcept = find(conceptGroup, item => item.tty === 'IN');
      let brandConcept = find(conceptGroup, item => item.tty === 'BN');

      let name = nameConcept.conceptProperties[0].name;

      if (brandConcept && brandConcept.conceptProperties && brandConcept.conceptProperties.length === 1) {
        name += ` ${brandConcept.conceptProperties[0].name}`;
      }

      return name;
    });
}

function findInteractionsByRxcuis (rxcuis) {
  return fetch(`https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=${rxcuis.join('+')}`)
    .then(res => {
      if (res.status !== 200) {
        throw 'Invalid response';
      }
      return res.json();
    })
    .catch((err) => ({}));
}

function getAdverseEventsByRxcui (medCoding, patientData) {
  const rxcui = medCoding.rxcui[0];

  const params = (data) => {
    let ageParam, genderParam, params = [];

    if (data.age) {
      ageParam = data.age.split('-');
      let leftRange = ageParam[0];
      // 200 - is magical here, because we need some really high value for right age range boundary
      // 200 is seems ok, because nobody lived that much yet
      let rightRange = ageParam[1] || 200;

      // only year units(801)
      ageParam = `minage=${leftRange}&maxage=${rightRange}`;
      params.push(ageParam);
    }

    if (data.gender) {
      // mapping pagweb values to opendfda
      // check API reference for patientsex for more details https://open.fda.gov/drug/event/reference/
      const sexes = {
        'M': 1,
        'F': 2,
      };

      genderParam = sexes[data.gender] || 0;
      genderParam = 'gender=' + genderParam;
      params.push(genderParam);
    }

    return params.join('&');
  };

  let additionalParams = params(patientData);

  const endpoint = [`${CONFIG.hcUrl}/adverse-events?rxcui=${rxcui}`, additionalParams].join('&');

  return fetch(endpoint)
    .then(res => {
      if (res.status !== 200) {
        throw 'Invalid response';
      }
      return res.json();
    })
    .then(res => {
      // res, medCoding
      const medicationData = {
        display: medCoding.display,
        total: res.data.total,
      };
      medicationData.list = res.data.list;

      return medicationData;
    })
    .catch((err) => {
      return {list: [], display: medCoding.display, total: 0};
    });
}

function getAdverseEventsByRxcuiAlt (medCoding, patientData) {
  // Example: https://api.fda.gov/drug/event.json?search=patient.drug.openfda.rxcui:310429+AND
  //          +(patient.drug.drugcharacterization:%221%22+%222%22)&limit=20
  const LIMIT = 20;
  const rxcui = medCoding.rxcui[0];

  const params = (data) => {
    let ageParam, genderParam, params = [];

    if (data.age) {
      ageParam = data.age.split('-');
      let leftRange = ageParam[0];
      // 200 - is magical here, because we need some really high value for right age range boundary
      // 200 is seems ok, because nobody lived that much yet
      let rightRange = ageParam[1] || 200;

      // only year units(801)
      ageParam = `patient.patientonsetageunit:801+AND+patient.patientonsetage:[${leftRange}+TO+${rightRange}]`;
      params.push(ageParam);
    }

    if (data.gender) {
      // mapping pagweb values to opendfda
      // check API reference for patientsex for more details https://open.fda.gov/drug/event/reference/
      const sexes = {
        'M': 1,
        'F': 2,
      };

      genderParam = sexes[data.gender] || 0;
      genderParam = 'patient.patientsex:' + genderParam;
      if (genderParam) {
        params.push(genderParam);
      }
    }

    return params.join('+AND+');
  };

  let additionalParams = params(patientData);

  const endpoint =
    [
      'https://api.fda.gov/drug/event.json?',
      'search=',
      `patient.drug.openfda.rxcui:${rxcui}`,
      additionalParams ? '+AND+' + additionalParams : '',
      `&limit=${LIMIT}`,
    ].join('');

  return fetch(endpoint)
    .then(res => {
      if (res.status !== 200) {
        throw 'Invalid response';
      }
      return res.json();
    })
    .then(res => {
      // res, medCoding
      const medicationData = {
        display: medCoding.display,
        total: res.meta.results.total,
      };
      medicationData.list = res.results;

      return medicationData;
    })
    .catch((err) => {
      return {list: [], display: medCoding.display, total: 0};
    });
}

function getMedicationDetails (medCoding) {
  // Example https://rxnav.nlm.nih.gov/REST/rxcuihistory/concept.json?rxcui=152923
  const rxcui = medCoding.rxcui[0];
  const endpoint = `https://rxnav.nlm.nih.gov/REST/rxcuihistory/concept.json?rxcui=${rxcui}`;

  return fetch(endpoint)
    .then(res => {
      if (res.status !== 200) {
        throw 'Invalid response';
      }
      return res.json();
    })
    .then(res => {
      medCoding.name = res.rxcuiHistoryConcept.bossConcept[0].bossName;
      return medCoding;
    })
    .catch((err) => {
      {
      }
    });
}

function getRecallByName (medCoding) {
  // Example: https://api.fda.gov/drug/event.json?search=patient.drug.openfda.rxcui:00006-0749-54&limit=20
  const LIMIT = 20;
  let name = medCoding.name;

  const endpoint = [`https://api.fda.gov/drug/enforcement.json?`,
    `search=`,
    `product_description:${name}+AND+`,
    `status:"Ongoing"`,
    `&limit=${LIMIT}`,
  ].join('');

  return fetch(endpoint)
    .then(res => {
      if (res.status !== 200) {
        throw 'Invalid response';
      }
      return res.json();
    })
    .then(res => filterRecall(res, medCoding))
    .catch((err) => {
      return {list: [], display: medCoding.display, total: 0};
    });
}

  function filterRecall (res, medCoding) {
  const recalls = {
    display: medCoding.display,
    total: res.meta.results.total,
  };

  recalls.list = res.results;

  return recalls;
}

function getRxClass (medCoding) {
  const rxcui = medCoding.rxcui[0];
  const endpoint = `https://rxnav.nlm.nih.gov/REST/rxclass/class/byRxcui.json?rxcui=${rxcui}`;

  return fetch(endpoint)
    .then(res => {
      if (res.status !== 200) {
        throw 'Invalid response';
      }
      return res.json();
    });
}

function apiRequest (endpointPart, params) {
  params = Object.assign({limit: 20, page: 1}, params);

  let stringOfParams = Object.keys(params).map(key => `${key}=${params[key]}`).join('&');
  let endpoint = `${CONFIG.hcUrl}/${endpointPart}?${stringOfParams}`;

  return fetch(endpoint)
    .then(res => res.json())
    .then(json => {
      if (json.success) {
        return json.data;
      } else {
        throw new HttpError(json.message);
      }
    });
}


function getDrugInfoByPredicitiveMatch (params) {
  let stringOfParams = Object.keys(params).map(key => `${key}=${params[key]}`).join('&');
  let endpoint = `${CONFIG.hcUrl}/get-drug-info-by-match-predictive?${stringOfParams}`;

  return fetch(endpoint)
    .then(res => res.json())
    .then(json => {
      if (json.success) {
        return json.data;
      } else {
        throw new HttpError(json.message);
      }
    });
}

function getDrugInfoByPredicitiveMatchGraphQl (params) {
  return drugInfoPredictiveSearch(params)
    .then(resp => {
      const success = !resp.errors;
      if (!success) {
        const message = resp.errors.reduce((res, e) => {
          res.push(e);
          return res;
        }, []).join(', ');
        throw new HttpError(message);
      }
      return resp.medicationMaster.items;
    })
    .catch(err => {
      throw new HttpError(`Error occurred while searching drug info.`);
    });
}

function getDrugInfoById (id) {
  let endpoint = `${CONFIG.hcUrl}/get-drug-info/${id}`;

  return fetch(endpoint)
    .then(res => res.json())
    .then(json => {
      if (json.success) {
        return json.data;
      } else {
        throw new HttpError(json.message);
      }
    });
}

function getDrugInfoByIdGraphQl (id) {
  return drugInfoById(id);
}
