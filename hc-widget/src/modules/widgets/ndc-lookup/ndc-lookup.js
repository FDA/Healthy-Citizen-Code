import Iframe from '../../iframe';
import $ from '../../../lib/dom';
import tpl from './ndc-lookup.hbs';
import resultsTpl from './ndc-lookup-results.hbs';
import API from '../../../modules/api';
import { HttpError } from '../../errors';

export default class NdcLookup {
  constructor(node, options) {
    this.options = options;
    this.options.events = {
      onLoad: this.onIframeLoad.bind(this)
    };

    new Iframe(node, options);
  }

  onIframeLoad(iframe) {
    this.parent = iframe;
    this.$form = $(tpl());
    this.parent.append(this.$form);

    this.form = this.$form.get(0);
    this.input = this.form.querySelector('input');
    this.$results = $(this.form.querySelector('.ndc-lookup-results'));

    this.$form.on('submit', this.onSubmit.bind(this));
  }

  onSubmit(e) {
    e.preventDefault();
    if (!this.isNdc()) {
      this.showErrorMessage();
      return;
    }

    this.hideErrorMessages();
    this.disable(true);

    API.getDrugInfoByNdcCode(this.input.value.trim())
      .then(data => this.drawResponse(data))
      .catch(err => {
        if (err instanceof HttpError) {
          this.showServerError(err.message);
        } else {
          console.log(err);
        }
      })
      .finally(() => this.disable(false));
  }

  isNdc() {
    let value = this.input.value.trim();
    return /^[0-9\-]+$/.test(value);
  }

  showErrorMessage() {
    let messageNode = this.form.querySelector('.error-message.client');
    messageNode.style.display = 'block';

    this.$results.get(0).innerHTML = '';

    Iframe.updateIframeHeight();
  }

  showServerError(message) {
    const messageNode = this.form.querySelector('.error-message.server');
    messageNode.innerText = message;
    messageNode.style.display = 'block';

    this.$results.get(0).innerHTML = '';

    Iframe.updateIframeHeight();
  }

  hideErrorMessages() {
    let nodes = this.form.querySelectorAll('.error-message');

    nodes.forEach(node => node.style.display = 'none');
    Iframe.updateIframeHeight();
  }

  disable(status) {
    this.form.querySelector('.btn').disabled = status;
  }

  drawResponse(data) {
    let node = $(resultsTpl(data));
    this.$results.replaceWith(node);
    this.$results = node;

    Iframe.updateIframeHeight();
  }
}
