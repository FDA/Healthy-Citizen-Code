import tpl from './preferences.hbs';
import tableTpl from './partials/medications-table.hbs';

import $ from '../../../lib/dom';

import API from '../../api';
import {prefrencesQuery, prefrencesMutate} from '../../queries';
import {HttpError} from "../../errors";

import ndcLookup from '../ndc-lookup/ndc-lookup';
import {updateIframeHeight, widgetError} from '../../../lib/utils';
import unionBy from 'lodash.unionby';

export default class Preferences {
  constructor(node, options) {
    this.options = options;
    this.$el = $(node);

    this.medications = [];

    prefrencesQuery({udid: this.options.udid})
      .then(data => {
        this.render();
        this.populate(data);
        this.bindEvents();
      })
      .catch(err => {
        console.log(err);
        widgetError('Unable to get data.');
      });
  }

  render() {
    this.form = $(tpl({ showImport: this.options.fhirDataImport })).get(0);

    const widgetOpts = Object.assign({}, this.options, {
      selection: true,
      onSelection: selected => this.addMedication(selected)
    });
    const lookupNode = this.form.querySelector('.js-widget-lookup');
    new ndcLookup(lookupNode, widgetOpts);

    this.table = this.form.querySelector('.js-table-lookup');
    this.btn = this.form.querySelector('[type="submit"]');

    if (this.options.fhirDataImport) {
      this.importBtn = this.form.querySelector('.import-data-btn');
    }

    this.$el.append(this.form);
  }

  addMedication(selected) {
    const medication = {
      _id: selected._id,
      ndc11: selected.ndc11,
      brandName: selected.brandName,
      rxcui: selected.rxnsatData.rxcui,
    };

    this.populate({medications: [medication]})
  }

  removeMedication(e) {
    if ($(e.target).matches('.js-remove-medication')) {
      const index = Number(e.target.dataset.index);
      this.medications.splice(index, 1);
      this.renderMedications();
    }
  }

  renderMedications() {
    if (this.medications.length) {
      this.table.innerHTML = tableTpl({medications: this.medications});
    } else {
      this.table.innerHTML = '';
    }
    updateIframeHeight();
  }

  populate({medications, ...other}) {
    if (medications.length) {
      this.medications = unionBy(this.medications, medications, 'ndc11');
      this.renderMedications();
    }

    Object.keys(other).forEach(name => {
      const field = this.form.querySelector(`[name="${name}"]`);
      if (field) {
        field.value = other[name];
      }
    });
  }

  bindEvents() {
    this.form.addEventListener('submit', (e) => this.onSubmit(e));
    this.table.addEventListener('click', (e) => this.removeMedication(e));

    if (this.options.fhirDataImport) {
      this.importBtn.addEventListener('click', (e) => this.importData(e));
    }
  }

  onSubmit(e) {
    e.preventDefault();

    this.disable(true);
    this.hideMessages();
    let data = this.serialize();
    const params = Object.assign({}, {udid: this.options.udid}, data);

    prefrencesMutate(params)
      .then(() => this.showSuccess())
      .catch(err => this.handleError(err))
      .finally(() => this.disable(false))
  }

  serialize() {
    let data = {};
    const fields = this.form.querySelectorAll('[name]');

    [].forEach.call(fields, field => {
      if (field.name === 'dstu2Url' && field.name === 'fhirId') {
        return;
      }

      if (field.type === 'radio' && !field.checked) {
        return;
      }
      data[field.name] = field.value;
    });

    data.medications = this.medications;

    return data;
  }

  importData(e) {
    e.preventDefault();
    this.hideMessages();

    let {dstu2Url, fhirId} = this.fhirRequestData();

    if (dstu2Url && fhirId) {
      this.disable(true);
      this.importDataRequest(dstu2Url, fhirId);
    } else {
      this.showServerError('FHIR server URL and FHIR ID are required to import data.');
    }
  }

  fhirRequestData() {
    return {
      dstu2Url: this.form.querySelector('[name="dstu2Url"]').value,
      fhirId: this.form.querySelector('[name="fhirId"]').value
    }
  }

  importDataRequest(dstu2Url, fhirId) {
    API.getMedicationCodings({
        dstu2Url, fhirId,
        dataSource: 'dstu2'
      })
      .then(data => {
        const medications = data.map(item => {
          return {
            ndc11: item.code,
            brandName: item.display,
            rxcui: [item.rxcui],
          }
        });
        this.populate({medications});

        let formData = this.serialize();
        const params = Object.assign({}, {udid: this.options.udid}, formData);

        return prefrencesMutate(params);
      })
      .then(() => this.showSuccess())
      .catch(err => this.handleError(err))
      .finally(() => this.disable(false))
  }

  disable(status) {
    this.btn.disabled = status;

    if (this.importBtn) {
      this.importBtn.disabled = status;
    }
  }

  handleError(err) {
    console.log(err);

    if (err instanceof HttpError) {
      this.showServerError(err.message);
    } else {
      this.showServerError('Unable to get data from fhir server. Please check FHIR Server URL and FHIR id correctness.');
    }
  }

  hideMessages() {
    const messages = this.form.querySelectorAll('.message');
    [].forEach.call(messages, node => node.classList.add('hidden'));
    updateIframeHeight();
  }

  showSuccess() {
    this.form.querySelector('.message__success').classList.remove('hidden');
    updateIframeHeight();
  }

  showServerError(message) {
    const errorNode = this.form.querySelector('.message__error');
    errorNode.innerText = message;
    errorNode.classList.remove('hidden');
    updateIframeHeight();
  }
}
