import QuestionnaireStartScreen from './questionnaire-start-screen/questionnaire-start-screen';
import HcWidgetForm from '../../form/form';
import hcWidgetAPI from '../../api';
import {widgetError} from '../../../lib/utils';

const STATUS = {
  IN_PROGRESS: 'In Progress'
};

export default class Questionnaire {
  constructor(node, options) {
    this.options = options;
    this.options.events = {
      onSubmit: () => this.onSubmit()
    };

    this.$el = node;

    return this.fetchData()
      .then(this.init.bind(this))
      .catch(err => {
        // TODO: fix showMessage
        console.error(err);
        widgetError('No questionnaire found');
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
    return hcWidgetAPI.getQuestionnaireByFhirId(this.options.fhirId)
      .then(this.getFieldValues.bind(this));
  }

  getFieldValues(data) {
    const requestOpts = {
      questions: data.questions,
      fhirDataUrl: this.options.stu3Url,
      fhirId: this.options.fhirId,
    };

    return hcWidgetAPI.getFhirValues(requestOpts)
      .then(questions => {
        return {
          _id: data._id,
          status: data.status,
          questions: questions
        }
      });
  }

  createStartScreen(data) {
    this.startScreen = new QuestionnaireStartScreen(data, this.options, this.onStart.bind(this));
    this.$el.append(this.startScreen.el);
  }

  onStart(data) {
    this.startScreen.destroy();
    this.createForm(data);
  }

  createForm(data) {
    this.form = new HcWidgetForm(data, this.options);
    this.$el.append(this.form.el);
  }

  onSubmit() {
    return this.fetchData()
      .then(data => {
        let cnt = 5;
        const timeoutFn = () => {
          this.$el.showMessage(
            `Thank you for your participation. Next questionnaire will be displayed in ${cnt} seconds...`
          );
          cnt--;

          if (cnt > 0) {
            setTimeout(timeoutFn, 1000);
          }

          if (cnt === 0) {
            this.$el.clear();
            this.form.destroy();
            this.init(data);
          }
        };

        setTimeout(timeoutFn, 1000);
      })
      .catch(err => {
        console.error(err);
        this.$el.showMessage(this.options['thankYouText']);
      });
  }
}