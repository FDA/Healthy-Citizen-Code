import Iframe from '../../iframe';
import QuestionnaireStartScreen from './questionnaire-start-screen/questionnaire-start-screen';
import HcWidgetForm from '../../form/form';
import hcWidgetAPI from '../../api';

const STATUS = {
  IN_PROGRESS: 'In Progress'
};

export default class Questionnaire {
  constructor(node, options) {
    this.options = options;
    this.options.events = {
      onLoad: this.onLoad.bind(this),
      onSubmit: this.onSubmit.bind(this)
    };

    new Iframe(node, this.options);
  }

  onLoad(iframe) {
    this.parent = iframe;

    return this.fetchData()
      .then(this.init.bind(this))
      .catch(err => {
        console.error(err);
        this.parent.showMessage('No questionnaire found');
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
      fhirDataUrl: this.options.fhirDataUrl,
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
    this.parent.append(this.startScreen.el);
  }

  onStart(data) {
    this.startScreen.destroy();
    this.createForm(data);
  }

  createForm(data) {
    this.form = new HcWidgetForm(data, this.options);
    this.parent.append(this.form.el);
  }

  onSubmit() {
    return this.fetchData()
      .then(data => {
        let cnt = 5;
        const timeoutFn = () => {
          this.parent.showMessage(
            `Thank you for your participation. Next questionnaire will be displayed in ${cnt} seconds...`
          );
          cnt--;

          if (cnt > 0) {
            setTimeout(timeoutFn, 1000);
          }

          if (cnt === 0) {
            this.parent.clear();
            this.form.destroy();
            this.init(data);
          }
        };

        setTimeout(timeoutFn, 1000);
      })
      .catch(err => {
        console.error(err);
        this.parent.showMessage(this.options['thankYouText']);
      });
  }
}