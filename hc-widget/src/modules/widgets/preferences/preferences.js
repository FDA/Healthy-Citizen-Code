import $ from '../../../lib/utils/dom';
import {
  preferencesQuery,
  preferencesMutate
} from '../../../lib/api/user-preferences/user-preferences';
import { importMedicationsFromDstu2 } from './api';
import tpl from './preferences.hbs';
import tableTpl from './partials/medications-table.hbs';

import ndcLookup from '../ndc-lookup/ndc-lookup';
import {
  updateIframeHeight,
  showErrorToUser,
} from '../../../lib/utils/utils';
import { ResponseError } from '../../../lib/exceptions'

import unionBy from 'lodash.unionby';

export default class Preferences {
  constructor(node, options) {
    this.options = options;
    this.$el = $(node);

    this.medications = [];

    preferencesQuery(this.options.udid)
      .then(data => {
        this.render();
        this.populate(data);
        this.bindEvents();
        updateIframeHeight();
      })
      .catch((err) => {
        console.log(err);
        showErrorToUser(node, ResponseError.EMPTY);
      });
  }

  render() {
    this.form = $(tpl({ showImport: this.options.fhirDataImport })).get(0);

    const lookupOptions = {
      selection: true,
      onSelection: selected => this.addMedication(selected),
      ...this.options,
    };

    const lookupNode = this.form.querySelector('.js-widget-lookup');
    new ndcLookup(lookupNode, lookupOptions);

    this.table = this.form.querySelector('.js-table-lookup');
    this.btn = this.form.querySelector('[type="submit"]');

    if (this.options.fhirDataImport) {
      this.importBtn = this.form.querySelector('.import-data-btn');
    }

    this.$el.append(this.form);
  }

  addMedication({ _id, packageNdc11, name }) {
    const medication = {
      ndc11: packageNdc11,
      brandName: name,
      _id,
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

    preferencesMutate(params)
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

      if (field.data === 'radio' && !field.checked) {
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
      this.showServerError('Correct FHIR server URL and FHIR ID are required to import data.');
    }
  }

  fhirRequestData() {
    return {
      dstu2Url: this.form.querySelector('[name="dstu2Url"]').value,
      fhirId: this.form.querySelector('[name="fhirId"]').value
    }
  }

  importDataRequest(dstu2Url, fhirId) {
    importMedicationsFromDstu2(dstu2Url, fhirId)
      .then((medications) => {
        this.populate({medications});

        const params = {
          udid: this.options.udid,
          ...this.serialize(),
        };

        return preferencesMutate(params);
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
    this.showServerError('Unable to save preferences. Please try again later.');
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
