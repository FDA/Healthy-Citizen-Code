import hcWidgetAPI from '../api';
import utils from '../../lib/utils';
import Iframe from '../iframe';

export default function formPagination({pages, controls, beforeTransitionCb, data}) {
  const pagination = {
    create({pages}) {
      this.current = 0;
      this.total = pages.length;
      // array of fields
      this.pages = pages;
      this.requestParams = data;

      this.$nextBtn = controls.nextBtn;
      this.$prevBtn = controls.prevBtn;
      this.$finishBtn = controls.finishBtn;

      this.preparePages();
      this.displayBtns();
      this.bindEvents();

      return this;
    },

    preparePages() {
      this.pages.map((page, index) => {
        if (index > 0) {
          page.el.classList.add('hidden');
        }
      });
    },

    bindEvents() {
      // handle inside dom.js
      this.paginateHandler = this.paginateHandler.bind(this);

      this.$nextBtn.on('click', this.paginateHandler);
      this.$prevBtn.on('click', this.paginateHandler);
    },

    destroy() {
      this.$nextBtn.off('click', this.paginateHandler);
      this.$prevBtn.off('click', this.paginateHandler);
    },

    saveAnswer(isLast) {
      this.setDisabled(true);
      let currentField = this.pages[this.current];
      let isCompleted = !!isLast;

      const requestData = {
        [currentField.name]: currentField.value()
      };

      return hcWidgetAPI.updateQuestionnaire(this.requestParams, requestData, isCompleted);
    },

    paginateHandler(e) {
      const target = e.target;
      const dir = target.dataset.paginate;
      const transition = this.getTransition(dir);
      const isPageValid = beforeTransitionCb(this);
      let requestPromise;

      // validate
      if (dir === 'next' && !isPageValid) {
        this.setDisabled(true);
        return;
      }

      requestPromise = dir === 'next' ? this.saveAnswer() : Promise.resolve();

      requestPromise
        .then(data => this.transition(transition))
        .catch(err => console.error('Unable to save answer', err));
    },

    getTransition: function (dir) {
      return {
        from: this.current,
        to: dir === 'next' ? this.current + 1 : this.current - 1
      };
    },

    transition({from, to}) {
      const fromPage = this.pages[from];
      const toPage = this.pages[to];

      this.current = to;
      fromPage.el.classList.add('hidden');
      toPage.el.classList.remove('hidden');

      this.displayBtns();
      this.setDisabled(false);
      Iframe.updateIframeHeight();
    },

    displayBtns() {
      const toggle = ({node, condition}) => {
        let method = condition ? 'remove' : 'add';
        node.classList[method]('hidden')
      };
      const showNext = {
        node: this.$nextBtn.get(0),
        condition: this.current < this.total - 1
      };

      const showPrev = {
        node: this.$prevBtn.get(0),
        condition: this.current > 0
      };

      const showSubmit = {
        node: this.$finishBtn.get(0),
        condition: this.isLast()
      };

      [showNext, showPrev, showSubmit].map(toggle);
    },

    setDisabled(status) {
      const nextBtn = this.isLast() ? this.$finishBtn.get(0) : this.$nextBtn.get(0);
      nextBtn.disabled = status;
    },

    getCurrentPage: function () {
      return this.pages[this.current];
    },

    isLast: function () {
      return this.current === this.total - 1
    }
  };

  return Object.create(pagination).create({pages})
}

