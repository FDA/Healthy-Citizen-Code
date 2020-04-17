import CONFIG from '../../../config';
import { get } from '../../../lib/utils/utils';
import lodashMap from 'lodash.map';

export function fetchQuestionnaireByFhirId(fhirId) {
  return fetch(CONFIG.HC_RESEARCH_URL + '/questionnaire-by-fhirid/' + fhirId)
    .then(res => res.json())
    .then(json => {
      let questionnaire = get(json, 'data.questionnaireDefinition.questionnaire', {});
      let hasQuestions = !!Object.keys(questionnaire).length;

      if (json.success === true && hasQuestions) {
        return [questionnaire, json.data];
      } else {
        throw new Error('No questionnaire found');
      }
    })
    .then(([questionnaire, data]) => {
      const questions = lodashMap(questionnaire, (question, key) => {
        question.fieldName = key;
        question.value = get(data, `answers.${key}`, null);
        return question;
      });

      return {
        questions,
        _id: data._id,
        status: data.status,
        nextQuestion: data.nextQuestion,
      };
    });
}

export function fetchFhirValues(questions, options) {
  const doRequest = (question) => {
    if (question.value) {
      return Promise.resolve(question);
    }

    if (!get(question, 'fhirResource')) {
      question.value = '';
      return Promise.resolve(question);
    }

    return fetch(getEndpoint(question, options))
      .then(res => {
        if (res.status !== 200) {
          return false;
        }

        return res.json();
      })
      .then(json => {
        let fhirFieldPath = get(question, 'fhirFieldPath');
        question.value = get(json, fhirFieldPath, '');

        return question;
      });
  };

  return Promise.all(questions.map(doRequest));
}

export function startQuestionnaire(params, questionnaireId) {
  const endpoint = CONFIG.HC_RESEARCH_URL + '/start-questionnaire/' + params.fhirId;

  const options = {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({data: {questionnaireId: questionnaireId}}),
  };

  return fetch(endpoint, options)
    .then(res => res.json())
    .then(json => {
      if (!json.success) {
        new Error('Unable to start the questionnaire.');
      }
    });
}

export function updateQuestionnaire(params, data) {
  const endpoint = CONFIG.HC_RESEARCH_URL + '/questionnaire-by-fhirid/' + params.fhirId;

  const options = {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      data: {
        questionnaireId: params.questionnaireId,
        answers: data,
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

function getEndpoint(question, options) {
  let fhirResourceUrl = get(question, 'fhirResource')
    .replace(':id', getFhirId(options));

  return getBaseUrl(options) + fhirResourceUrl;
}

function getFhirId(options) {
  if (['stu3', 'dstu2'].includes(options.dataSource)) {
    return options.fhirId;
  } else if (options.dataSource === 'options.dataSource') {
    return options.patientStu3;
  } else {
    return options.epicPatientStu3;
  }
}

function getBaseUrl(options) {
  if (options.dataSource === 'stu3') {
    return options.stu3Url;
  } else if (options.dataSource === 'dstu2') {
    return options.dstu2Url;
  } else {
    return options.fhirServerUrl;
  }
}
