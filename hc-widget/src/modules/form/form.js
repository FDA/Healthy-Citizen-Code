import $ from '../../lib/dom';
import { map } from '../../lib/utils';
import formFieldFactory from '../form-fields/form-field-factory';
import formTemplate from './form.hbs';
import formPagination from './form-pagination';

export default class HcWidgetForm {
  constructor(data, options) {
    this.options = options;
    this.$el = $(formTemplate());
    this.el = this.$el.get(0);

    this.init(data);
    this.bindEvents();
  }

  init(data) {
    this.data = data;
    this.render(data);
  }

  render() {
    this.fields = map(this.data.questions, this.createField.bind(this));

    const paginationOptions = {
      pages: this.fields,
      beforeTransitionCb: HcWidgetForm.validatePage,
      controls: {
        nextBtn: $('[data-paginate=next]', this.el),
        prevBtn: $('[data-paginate=prev]', this.el),
        finishBtn: $('[type=submit]', this.el)
      },
      data: {
        fhirId: this.options.fhirId,
        questionnaireId: this.data._id
      }
    };
    this.pagination = formPagination(paginationOptions);
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
      .on('submit', this.submit.bind(this))
      .on('change', this.changeHandler.bind(this))
      .on('keyup', this.changeHandler.bind(this));
  }

  unbindEvents() {
    this.$el
      .off('submit', this.submit)
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

  submit(e) {
    e.preventDefault();

    if (!HcWidgetForm.validatePage(this.pagination)) {
      this.pagination.setDisabled(true);
      return;
    }

    this.pagination.saveAnswer(true)
      .then(this.options.events.onSubmit);
  }
}