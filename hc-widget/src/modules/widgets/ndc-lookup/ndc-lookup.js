import _debounce from 'lodash.debounce';
import $ from '../../../lib/utils/dom';
import { updateIframeHeight } from '../../../lib/utils/utils';
import tpl from './ndc-lookup.hbs';
import resultsTpl from './partials/results.hbs';
import suggestionsTpl from './partials/suggestions.hbs';
import {
  drugInfoPredictiveSearch,
  drugInfoById,
} from '../../../lib/api/grugsMaster/drugs';
import { ResponseError } from '../../../lib/exceptions';

// TODO increase page counter if hasNextPage
export default class NdcLookup {
  constructor(node, options) {
    this.$el = $(node);
    this.options = options;
    this.loading = false;

    this.resetRequestParams();
    this.init();
  }

  resetRequestParams() {
    this.page = 0;
    this.hasNextPage = true;
  }

  init() {
    this.$form = $(tpl());
    this.$el.append(this.$form);

    this.form = this.$form.get(0);
    this.input = this.form.querySelector('input');
    this.$results = $(this.form.querySelector('.js-results'));
    this.suggestions = this.form.querySelector('.js-suggestions');
    this.suggestionsList = this.suggestions.querySelector('.ndc-lookup__suggestions-list');
    this.closeBtn = this.form.querySelector('.js-close');

    this.form.addEventListener('submit', e => e.preventDefault());
    this.input.addEventListener('input', _debounce(e => this.onInput(e), 500));
    this.input.addEventListener('paste', e => this.onInput(e));
    this.suggestions.addEventListener('click', (e) => this.selectSuggestion(e));
    this.closeBtn.addEventListener('click', (e) => this.hideSuggestions(e));
    this.suggestions.addEventListener('scroll', (e) => this.onScroll(e));
  }

  onInput() {
    this.hideSuggestions();
    this.resetRequestParams();

    const query = this.input.value.trim();
    if (!query) {
      return;
    }

    this.fetchSuggestions(query);
  }

  onScroll(e) {
    const bottomEdge = e.target.scrollHeight - e.target.scrollTop === e.target.clientHeight;

    if (this.loading || !bottomEdge || !this.hasNextPage) {
      return;
    }

    this.showLoader();

    this.fetchSuggestions(this.input.value.trim())
      .then(() => this.hideLoader());
  }

  fetchSuggestions(query) {
    this.page += 1;
    const params = { q: query, page: this.page };

    return drugInfoPredictiveSearch(params)
      .then((data) => {
        this.hasNextPage = data.hasNextPage;
        return data.list;
      })
      .then(data => this.drawSuggestions(data))
      .catch(err => this.handleError(err));
  }

  fetchResults(id) {
    this.hideErrorMessages();

    drugInfoById(id)
      .then((data) => {
        const dataItem = data.list[0];

        if (this.options.selection) {
          this.options.onSelection(dataItem);
        } else {
          this.drawResults(dataItem);
        }
      })
      .catch(err => this.handleError(err));
  }

  showLoader() {
    this.loading = true;
    const loader = $('<li class="ndc-lookup__suggestions-item js-loader">Loading...</li>').get(0);
    this.suggestionsList.appendChild(loader);
  }

  hideLoader() {
    const loader = this.suggestionsList.querySelector('.js-loader');
    $(loader).remove();

    this.loading = false;
  }

  selectSuggestion(e) {
    if (!$(e.target).matches('.js-suggestion')) {
      return;
    }

    this.resetRequestParams();
    const id = e.target.dataset.id;

    this.fetchResults(id);
    this.hideSuggestions();
  }

  handleError(err) {
    if (err instanceof ResponseError) {
      this.showServerError(err.message);
    }
    this.showServerError(ResponseError.EMPTY);
    console.error(err);
  }

  showServerError(message) {
    const messageNode = this.form.querySelector('.error-message.server');
    messageNode.innerText = message;
    messageNode.classList.remove('hidden');

    this.$results.get(0).innerHTML = '';

    updateIframeHeight();
  }

  hideErrorMessages() {
    let nodes = this.form.querySelectorAll('.error-message');
    nodes.forEach(node => node.classList.add('hidden'));
    updateIframeHeight();
  }

  drawResults(data) {
    const node = $(resultsTpl(data));

    this.$results.replaceWith(node);
    this.$results = node;

    updateIframeHeight();
  }

  drawSuggestions(data) {
    const node = $(suggestionsTpl({suggestions: data})).get(0);
    const formClass = data.length > 0 ? 'ndc-lookup--searching' : 'ndc-lookup--not-found';

    this.form.classList.remove('ndc-lookup--not-found');
    this.form.classList.add(formClass);
    this.suggestions.classList.remove('hidden');
    this.closeBtn.classList.remove('hidden');

    this.suggestionsList.innerHTML += node.innerHTML;

    updateIframeHeight();
  }

  hideSuggestions() {
    this.form.classList.remove('ndc-lookup--searching', 'ndc-lookup--not-found');
    this.suggestions.classList.add('hidden');
    this.closeBtn.classList.add('hidden');
    this.suggestionsList.innerHTML = '';
    this.resetRequestParams();

    updateIframeHeight();
  }
}
