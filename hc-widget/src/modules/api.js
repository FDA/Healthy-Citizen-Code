import lodashGet from 'lodash.get';
import lodashMap from 'lodash.map';
import { HttpError } from './errors';
import util from '../lib/utils';
import CONFIG from '../../config.json';

const hcWidgetAPI = {
  getQuestionnaireByFhirId,
  getFhirValues,
  getDrugInteractions,
  getAdverseEvents,
  getAdverseEventsAlt,
  getRecalls,
  getWidgetParams,
  getMedicationCodingsFromFhir,
  findInteractionsByRxcuis,
  getMedicationGenericName,
  getRxcuiByNdc,
  startQuestionnaire,
  updateQuestionnaire,
  getRxClass,
  getDrugInfoByNdcCode
};
export default hcWidgetAPI;

function startQuestionnaire(params, questionnaireId) {
  const endpoint = CONFIG.hcResearchUrl + '/start-questionnaire/' + params.fhirId;

  const options = {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({data: {questionnaireId: questionnaireId}})
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

function updateQuestionnaire(params, data, isCompleted) {
  const endpoint = CONFIG.hcResearchUrl + '/questionnaire-by-fhirid/' + params.fhirId;

  const options = {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      data: {
        questionnaireId: params.questionnaireId,
        answers: data,
        isCompleted: isCompleted
      }
    })
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

function getWidgetParams(widgetId) {
  const endpoint = `${CONFIG.widgetUrl}/widgets/${widgetId}`;

  return fetch(endpoint)
    .then(res => res.json())
    .then(json => {
      if (json.success === true && json.data) {
        return json.data;
      } else {
        throw new Error('Unable to load widget params');
      }
    });
}

function getQuestionnaireByFhirId(fhirId) {
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
      }
    });
}

function getFhirValues({questions, fhirDataUrl, fhirId}) {
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

function getDrugInteractions(fhirDataUrl, fhirId) {
  return getMedicationCodingsFromFhir(fhirDataUrl, fhirId)
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
              description: interactionPair.description
            });
          })
        })
      });
      const count = results.length;
      const list = results;
      return {
        list,
        count
      }
    })
    .catch(err => {
      return {
        list: [],
        count: 0,
      }
    });
}

function getMedicationCodingsFromFhir(fhirDataUrl, fhirId) {
  // Example: http://test.fhir.org/r3/Patient?_id=pat1&_revinclude=MedicationRequest:subject&_format=json
  // https://sb-fhir-stu3.smarthealthit.org/smartstu3/open/Patient?_id=aa27c71e-30c8-4ceb-8c1c-5641e066c0aa&_revinclude=MedicationRequest:subject&_format=json
  if (!fhirDataUrl || !fhirId) {
    return;
  }
  const fhirUrl = `${fhirDataUrl}/Patient?_id=${fhirId}&_revinclude=MedicationRequest:subject&_format=json`;
  const ndcSystem = 'http://hl7.org/fhir/sid/ndc';

  return fetch(fhirUrl)
    .then(res => {
      if (res.status !== 200) {
        return false;
      }
      return res.json()
    })
    .then(json => {
      const entries = lodashGet(json, 'entry', []);
      const medicationCodings = entries
        .map(entry => {
          const isMedRequest = lodashGet(entry, 'resource.resourceType') === 'MedicationRequest';
          if (!isMedRequest) {
            return null;
          }
          const medCodConcept = lodashGet(entry, 'resource.medicationCodeableConcept');
          const isNdcSystem = lodashGet(medCodConcept, 'coding.0.system') === ndcSystem;
          if (!isNdcSystem) {
            return null;
          }
          return medCodConcept.coding[0];
        })
        .filter(medicationCoding => medicationCoding);

      return medicationCodings;
    })
    .catch(err => []);
}

function getAdverseEvents(fhirDataUrl, fhirId, patientData) {
  return getMedicationCodingsFromFhir(fhirDataUrl, fhirId)
    .then(medCodings => {
      const rxcuiPromises = medCodings.map(getRxcuiByNdc);
      return Promise.all(rxcuiPromises);
    })
    .then(medCodings => {
      const promises = medCodings.reduce((result, item) => {
        if (item.rxcui.length) {
          result.push(getAdverseEventsByRxcui(item, patientData));
        }

        return result;
      }, []);
      return Promise.all(promises);
    });
}

function getAdverseEventsAlt(fhirDataUrl, fhirId, patientData) {
  return getMedicationCodingsFromFhir(fhirDataUrl, fhirId)
    .then(medCodings => {
      const rxcuiPromises = medCodings.map(getRxcuiByNdc);
      return Promise.all(rxcuiPromises);
    })
    .then(medCodings => {
      const promises = medCodings.reduce((result, item) => {
        if (item.rxcui.length) {
          result.push(getAdverseEventsByRxcuiAlt(item, patientData));
        }

        return result;
      }, []);
      return Promise.all(promises);
    });
}

function getRecalls(fhirDataUrl, fhirId) {
  return getMedicationCodingsFromFhir(fhirDataUrl, fhirId)
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
      const promises = medCodings.map(getRecallByName);
      return Promise.all(promises);
    });
}

function getRxcuiByNdc(medCoding) {
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

function getMedicationGenericName(rxcui) {
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
      let nameConcept = util.find(conceptGroup, item => item.tty === 'IN');
      let brandConcept = util.find(conceptGroup, item => item.tty === 'BN');

      let name = nameConcept.conceptProperties[0].name;

      if (brandConcept && brandConcept.conceptProperties && brandConcept.conceptProperties.length  === 1) {
        name += ` ${brandConcept.conceptProperties[0].name}`
      }

      return name;
    });
}

function findInteractionsByRxcuis(rxcuis) {
  return fetch(`https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=${rxcuis.join('+')}`)
    .then(res => {
      if (res.status !== 200) {
        throw 'Invalid response';
      }
      return res.json();
    })
    .catch((err) => ({}))
}

function getAdverseEventsByRxcui(medCoding, patientData) {
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
        'F': 2
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
        total: res.data.total
      };
      medicationData.list = res.data.list;

      return medicationData;
    })
    .catch((err) => {
      return {list: [], display: medCoding.display, total: 0};
    })
}

function getAdverseEventsByRxcuiAlt(medCoding, patientData) {
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
        'F': 2
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
      `&limit=${LIMIT}`
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
        total: res.meta.results.total
      };
      medicationData.list = res.results;

      return medicationData;
    })
    .catch((err) => {
      return {list: [], display: medCoding.display, total: 0};
    })
}

function getMedicationDetails(medCoding) {
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
    .catch((err) => {{}})
}

function getRecallByName(medCoding) {
  // Example: https://api.fda.gov/drug/event.json?search=patient.drug.openfda.rxcui:00006-0749-54&limit=20
  const LIMIT = 20;
  let name = medCoding.name;

  const endpoint = [`https://api.fda.gov/drug/enforcement.json?`,
          `search=`,
            `product_description:${name}+AND+`,
            `status:"Ongoing"`,
            `&limit=${LIMIT}`
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

function filterRecall(res, medCoding) {
  const recalls = {
    display: medCoding.display,
    total: res.meta.results.total
  };

  recalls.list = res.results;

  return recalls;
}

function getRxClass(medCoding) {
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

function getDrugInfoByNdcCode(ndc) {
  let endpoint = `${CONFIG.hcUrl}/get-drug-info-by-ndc-code/${ndc}`;

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