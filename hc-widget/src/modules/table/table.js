import $ from '../../lib/utils/dom';
// TODO: make it single tpl
import tpl from './table.hbs';
import tplBody from './partials/tbody.hbs';
import tplGroupRow from './partials/group-rows.hbs';

import {updateIframeHeight} from '../../lib/utils/utils';
import classNames from 'classnames';

const SORT = {
  ASC: 'asc',
  DESC: 'desc'
};

function convertType(v, type) {
  if (type === 'Number') {
    return v ? parseInt(v.value) : -Infinity;
  } else if (type === 'Date') {
    // m/d/y
    let dateParts = v.view.split('/').map(Number);
    // month index in js starts with zero
    return new Date(dateParts[2], dateParts[0] - 1, dateParts[1]);
  } else {
    return v.view;
  }
}

// data{ list[], count:Int }
export default class Table {
  constructor({
    heads, data, groupTitle, sortBy, order,
    hasGrouping = false,
    accordion = false,
    hideCols = 0,
    print = false,
    tableClass = null
  }) {
    this.data = data;
    this.heads = heads;
    this.hasGrouping = hasGrouping;

    this.order = order || SORT.ASC;
    this.sorted = this.initialSortIndex(sortBy);

    let rowLength = accordion ? heads.length - hideCols : heads.length;

    let config = {
      rowLength: rowLength,
      rowEnd: heads.length,
      tableClass: classNames('table', 'table-sortable', tableClass, { 'table-accordion': accordion }),
      accordion,
      hasGrouping,
      groupTitle,
      print
    };

    // define dataTypes
    this.sort();
    this.tableOpts = { heads, data, config };

    this.$tableEl = $(tpl(this.tableOpts));
    this.tableEl = this.$tableEl.get(0);

    this.changeHeadClass();

    this.bindEvents();
  }

  bindEvents() {
    this.$tableEl.on('click', (e) => {
      // TODO refactor to map
      if (e.target.nodeName === 'TH') {
        this.applySorting.call(this, e);
        return;
      }

      if ($(e.target).matches('.accordion-control.row')) {
        this.toggleRow.call(this, e);
        return;
      }

      if ($(e.target).matches('.group')) {
        this.toggleGroup.call(this, e);
        return;
      }

      if ($(e.target).matches('.js-print')) {
        window.print();
        return;
      }
    });
  }

  applySorting(e) {
    e.preventDefault();

    const index = parseInt(e.target.dataset.index);

    if (this.sorted === index) {
      this.toggleOrder();
    } else {
      this.sorted = index;
      this.order = SORT.ASC;
    }

    this.sort();
    this.redraw();
    this.changeHeadClass();
  }

  initialSortIndex(sortBy) {
    let sortIndex = 0;

    if (sortBy) {
      sortIndex = this.heads.indexOf(sortBy);
    }

    return sortIndex;
  }

  toggleOrder() {
    this.order = this.order === SORT.ASC ? SORT.DESC : SORT.ASC;
  }

  sort() {
    if (this.hasGrouping) {
      this.sortGroup();
    } else {
      this.sortList();
    }
  }

  // sortKey as param
  sortList(data) {
    let sortKey = this.heads[this.sorted];
    let list = data || this.data;
    let type = list[0][sortKey].data;

    list.sort((a, b) => {
      let aValue = convertType(a[sortKey], type),
        bValue = convertType(b[sortKey], type);

      if (aValue === bValue) {
        return 0;
      } else {
        if (this.order === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      }
    });
  }

  sortGroup() {
    this.data.forEach(item => {
      if (!item.list.length) {
        return;
      }

      this.sortList(item.list);
    });
  }

  toggleRow(e) {
    const $btn = $(e.target);
    const isActive = e.target.classList.contains('is-active');
    const rowChild = $btn.closest('tr').get(0).nextElementSibling;

    e.preventDefault();
    e.target.classList.toggle('is-active');

    rowChild.classList[isActive ? 'add' : 'remove']('is-hidden');

    updateIframeHeight();
  }

  toggleGroup(e) {
    const activeGroup = this.tableEl.querySelector('.group-body:not(.is-hidden)');
    const activeBtn = this.tableEl.querySelector('.accordion-control.group.is-active');

    const targetGroupIndex = $(e.target).closest('tbody').get(0).dataset.index;
    const targetGroup = this.tableEl.querySelector(`.group-body[data-index="${targetGroupIndex}"]`);
    const targetBtn = this.tableEl.querySelector(`.accordion-control.group[data-index="${targetGroupIndex}"]`);

    if (activeGroup) {
      if (activeGroup !== targetGroup) {
        targetGroup.classList.remove('is-hidden');
        targetBtn.classList.add('is-active');
      }

      activeGroup.classList.add('is-hidden');
      activeBtn.classList.remove('is-active');
    } else {
      targetGroup.classList.remove('is-hidden');
      targetBtn.classList.add('is-active');
    }

    updateIframeHeight();
  }

  redraw() {
    if (this.hasGrouping) {
      const groups = this.tableEl.querySelectorAll('.group-body');
      for (let i = 0; i < groups.length; i++) {
        const renderData = {
          list: this.data[i].list,
          config: this.tableOpts.config
        };

        groups[i].innerHTML = tplGroupRow(renderData);
      }
    } else {
      const newBody = tplBody(this.tableOpts);
      this.tableBody = this.tableEl.querySelector('tbody');

      this.tableBody.innerHTML = newBody;
    }
  }

  changeHeadClass() {
    const head = this.tableEl.querySelectorAll('th')[this.sorted];

    head.classList.remove('sorted_asc', 'sorted_desc');
    head.classList.add('sorted_' + this.order);
  }

  // TODO: move to options
  appendTo($el) {
    $el.append(this.$tableEl);
    updateIframeHeight();
  }
}
