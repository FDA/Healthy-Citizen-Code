import $ from '../../../../lib/utils/dom';
import { startQuestionnaire } from '../api';
import template from './questionnaire-start-screen.hbs';

export default class QuestionnaireStartScreen {
  constructor(data, options, onStartCb) {
    this.data = data;
    this.options = options;
    this.$el = $(template(this.options));
    this.el = this.$el.get(0);
    this.$btn = $(this.el.querySelector('button'));
    this.onStartCb = onStartCb;

    this.$btn.on('click', this.fetchData.bind(this));
  }

  fetchData() {
    this.$btn.get(0).disabled = true;

    startQuestionnaire(this.options, this.data._id)
      .then(() => {
        this.onStartCb(this.data);
      })
  }

  destroy() {
    this.$el.off('submit', this.fetchData);
    this.el.remove();
  }
}
