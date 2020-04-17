let dataSource = [];
let $outSpan;
let $tagList;
let $dropBox;
let $tagboxEl;
let $tglBtn;

const component = {};

function onDocumentClick(e) {
  if (!$(e.target)
    .closest($tagboxEl).length) {
    toggleDropbox(false);
  }
}

function toggleDropbox(force = true) {
  $dropBox.toggle(force);
}

function onItemClick(index) {
  dataSource[index].checked = !dataSource[index].checked;
  syncWithSelection();
}

function syncWithSelection() {
  const $items = $('.fg3d-tagbox-listitem', $tagList);
  let count = 0;

  _.each(dataSource, (item, index) => {
    $($items[index])
      .toggleClass('selected', !!item.checked);
    if (item.checked) {
      count++;
    }
  });

  component.onValueChanged && component.onValueChanged({value: _.map(_.filter(dataSource, x => x.checked), x => x.name)});
  $outSpan.text([count || 'Not', count ? (count > 1 ? 'are' : 'is') : '', 'selected'].join(' '));
  $tglBtn.text((count === dataSource.length ? 'Deselect' : 'Select') + ' all');
}

function onToggleAll() {
  const up = !!_.find(dataSource, x => !x.checked);
  _.each(dataSource, x => {
    x.checked = up;
  });

  syncWithSelection();
}

function initTagList() {
  $tglBtn = $('<button>')
    .addClass('fg3d-tagbox-tglbtn')
    .click(onToggleAll);
  $tagList.empty();
  $tagList
    .append($tglBtn)
    .append(_.map(dataSource, (item, index) => $('<div>')
      .addClass('fg3d-tagbox-listitem')
      .html(item.name)
      .click(() => onItemClick(index))))
}

function initDataSource(source) {
  dataSource = _.map(source, item => ({name: item, checked: false}));
}

function initValues(values) {
  _.each(dataSource, item => {
    item.checked = values.indexOf(item.name) >= 0
  });
}

function tagBox($el, params) {
  $tagboxEl = $el;
  $outSpan = $('<span>')
    .addClass('dx-placeholder');
  $tagList = $('<div>')
    .addClass('fg3d-tagbox-list');
  $dropBox = $('<div>')
    .addClass('fg3d-tagbox-dropbox')
    .css('display', 'none')
    .append($tagList);

  initDataSource(params.dataSource);
  initValues(params.value);
  initTagList();
  syncWithSelection();

  $(document)
    .on('click', onDocumentClick);

  $tagboxEl.empty()
    .append($outSpan)
    .append($dropBox)
    .addClass('fg3d-tagbox')
    .click(() => toggleDropbox(true));

  component.option = (name, val) => {
    if (name === 'value') {
      initValues(val);
      syncWithSelection();
    } else {
      throw new Error('Unmocked option: ' + name);
    }
  };
  component.onValueChanged = params.onValueChanged;

  params.onInitialized && params.onInitialized({component})
}

module.exports = {tagBox};
