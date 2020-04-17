import $ from '../../../../lib/utils/dom';
import { map } from '../../../../lib/utils/utils';
import formFieldFactory from '../form-fields/form-field-factory';
import formTemplate from './form.hbs';
import formPagination from './form-pagination';

export default class HcWidgetForm {
  constructor(data, options) {
    this.options = options;
    this.$el = $(formTemplate());
    this.el = this.$el.get(0);

    this.render(data);
    this.bindEvents();
  }

  render(data) {
    this.fields = map(data.questions, q => this.createField(q));

    const paginationOptions = {
      pages: this.fields,
      beforeTransitionCb: HcWidgetForm.validatePage,
      controls: {
        nextBtn: $('[data-paginate=next]', this.el),
        prevBtn: $('[data-paginate=prev]', this.el),
        finishBtn: $('.js-finish-btn', this.el)
      },
      data: {
        fhirId: this.options.fhirId,
        questionnaireId: data._id,
      },
      onComplete: this.options.events.onComplete,
      startingPage: this.getStartPage(data),
    };

    this.pagination = formPagination(paginationOptions);
  }

  getStartPage(data) {
    let startIndex = data.questions.map(q => q.fieldName).indexOf(data.nextQuestion);
    return startIndex > -1 ? startIndex : 0;
  }

  createField(question) {
    const opts = {
      appendTo: $('.form-body', this.el),
      readonly: !!question.immutable,
      value: question.value
    };

    return formFieldFactory(question, opts);
  }

  destroy() {
    this.unbindEvents();
    this.pagination.destroy();
    this.pagination = null;
    this.el.remove();
  }

  bindEvents() {
    this.$el
      .on('change', this.changeHandler.bind(this))
      .on('keyup', this.changeHandler.bind(this));
  }

  unbindEvents() {
    this.$el
      .off('change', this.changeHandler)
      .off('keyup', this.changeHandler);
  }

  static validatePage(pagination) {
    const currentPage = pagination.getCurrentPage();
    const isValid = currentPage.isValid();

    if (isValid) {
      currentPage.hideError();
    } else {
      currentPage.showError();
    }
    return isValid;
  }

  changeHandler() {
    const isValid = HcWidgetForm.validatePage(this.pagination);
    this.pagination.setDisabled(!isValid);
  }
}
