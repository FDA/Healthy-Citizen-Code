import {
  showErrorToUser,
  updateIframeHeight
} from '../../../lib/utils/utils';

import QuestionnaireStartScreen from './questionnaire-start-screen/questionnaire-start-screen';
import HcWidgetForm from './form/form';
import {
  fetchQuestionnaireByFhirId,
  fetchFhirValues,

} from './api';

const STATUS = {
  IN_PROGRESS: 'In Progress'
};

const widgetDefaults = {
  'thankYouText': 'Thank you for participating in this survey.',
  'welcomeText': 'Hello! Click the button below to start the questionnaire.'
};

export default class Questionnaire {
  constructor(node, options) {
    this.options = {
      ...options,
      ...widgetDefaults,
      events: {
        onComplete: () => this.onComplete()
      }
    };

    this.el = node;

    return this.fetchData()
      .then(data => this.init(data))
      .catch((err) => {
        console.error(err);
        showErrorToUser('No questionnaire found');
      });
  }

  init(data) {
    if (data.status === STATUS.IN_PROGRESS) {
      this.createForm(data);
    } else {
      this.createStartScreen(data);
    }
  }

  fetchData() {
    return fetchQuestionnaireByFhirId(this.options.fhirId)
      .then(res => {
        return this.getFieldValues(res);
      });
  }

  getFieldValues(res) {
    return fetchFhirValues(res.questions, this.options)
      .then(questions => {
        return {
          _id: res._id,
          status: res.status,
          questions,
          nextQuestion: res.nextQuestion,
        }
      });
  }

  createStartScreen(data) {
    this.startScreen = new QuestionnaireStartScreen(data, this.options, this.onStart.bind(this));
    this.el.appendChild(this.startScreen.el);
  }

  onStart(data) {
    this.startScreen.destroy();
    this.createForm(data);
  }

  createForm(data) {
    this.form = new HcWidgetForm(data, this.options);
    this.el.appendChild(this.form.el);
    updateIframeHeight();
  }

  onComplete() {
    return this.fetchData()
      .then(data => {
        let cnt = 5;
        const timeoutFn = () => {
          showErrorToUser(
            `Thank you for your participation. Next questionnaire will be displayed in ${cnt} seconds...`
          );

          if (cnt > 0) {
            setTimeout(timeoutFn, 1000);
          }

          if (cnt === 0) {
            this.el.firstChild.remove();
            this.form.destroy();
            this.init(data);
          }
          cnt--;
        };

        setTimeout(timeoutFn, 1000);
      })
      .catch(err => {
        console.error(err);
        showErrorToUser(this.options.thankYouText);
      });
  }
}
