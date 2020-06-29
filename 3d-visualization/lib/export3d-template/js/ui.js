const localConfig = {};
const linkModelToControl = {};

function onInterfaceUpdate(vm) {
  let i = 0;

  while (i < 100) {
    let path = objectEquals(vm.config, localConfig);

    if (path) {
      _.set(localConfig, path, _.get(vm.config, path));

      linkModelToControl[path] && linkModelToControl[path](vm.config);
    } else {
      break;
    }
    i++;
  }

  renderInfobox(vm.selectedNodes, vm.tags);
}

function bindUiHandlers(context) {
  const getLink = {
    modelToCheckbox: name => conf => $('#fg3d-' + name)
      .prop('checked', conf[name]),
    modelToInput: name => conf => $('#fg3d-' + name)
      .val(conf[name]),
    checkboxToModel: name => (vm, e) => {
      localConfig[name] = vm.config[name] = e.target.checked;
      vm.doRefreshGraph();
    },
    inputToModel: name => (vm, e) => {
      localConfig[name] = vm.config[name] = e.target.value;
      vm.doRefreshGraph();
    },
  };
  const linkTypeEvents = {
    Checkbox: {click: name => getLink.checkboxToModel(name)},
    Input: {
      keyup: name => getLink.inputToModel(name),
      change: name => getLink.inputToModel(name),
    },
  };
  const biDirectionalLinkConfig = {
    showOptions: {
      model: vm => {
        $('.fg3d-left-panel-block.fg3d-config').toggleClass('open', vm.showOptions);
        $('#fg3d-left-panel').toggleClass('both-open', vm.showOptions && vm.showLegend);
      },
      events: {
        '#fg3d-config-icon,.fg3d-config .fg3d-close:click': vm => {
          vm.toggleConfig();
          onInterfaceUpdate(vm);
        },
      },
    },
    showLegend: {
      model: vm => {
        $('.fg3d-left-panel-block.fg3d-legend').toggleClass('open', vm.showLegend);
        $('#fg3d-left-panel').toggleClass('both-open', vm.showOptions && vm.showLegend);
      },
      events: {
        '#fg3d-legend-icon,.fg3d-legend .fg3d-close:click': (vm, e) => {
          vm.toggleLegend(e);
          onInterfaceUpdate(vm);
        },
      },
    },
    hlLabelNodes: 'Checkbox',
    hlLabelLinks: 'Checkbox',
    hlColorize: 'Input',
    hlBrightness: 'Input',
    hlDim: 'Input',
    labelLinks: 'Checkbox',
    labelNodes: 'Checkbox',
    animCamera: {
      model: getLink.modelToCheckbox('animCamera'),
      events: {
        '#fg3d-animCamera:click': (vm,e) => {
          getLink.checkboxToModel('animCamera')(vm,e);
          vm.toggleCameraOrbit();
        },
      },
    },
    fixDragged: 'Checkbox',
    linkCurvature: 'Input',
    linkDistance: {
      model: getLink.modelToInput('linkDistance'),
      events: {
        '#fg3d-linkDistance:change': (vm,e) => {
          getLink.inputToModel('linkDistance')(vm,e);
          vm.reheatSimulation();
        },
        '#fg3d-linkDistance:keyup': (vm,e) => {
          getLink.inputToModel('linkDistance')(vm,e);
          vm.reheatSimulation();
        },
      },
    },
    nodeFilter: 'Input',
    linkFilter: 'Input',
    showArrows: 'Checkbox',
    arrowSize: 'Input',
    showParticles: 'Checkbox',
    particleSize: 'Input',
  };
  const additionalClickHandlers = {
    'fg3d-export-png': 'screenCapture',
    'fg3d-zoomin-nav': 'navigationZoomIn',
    'fg3d-zoomout-nav': 'navigationZoomOut',
    'fg3d-zoomcenter-nav': 'navigationCenter',
  }

  _.each(biDirectionalLinkConfig, (config, name) => {
    let modelToControl;
    let controlToModel = {};

    if (typeof config === 'string') {
      modelToControl = getLink['modelTo' + config](name);
      controlToModel = {};
      _.forOwn(linkTypeEvents[config], (generator, eventName) => {
        controlToModel['#fg3d-' + name + ':' + eventName] = generator(name)
      });
    } else {
      modelToControl = config.model;
      controlToModel = config.events || {};
    }

    linkModelToControl[name] = modelToControl;

    _.forOwn(controlToModel, (handler, key) => {
      const [selector, eventName] = key.split(':');
      $(selector)
        .on(eventName, e => handler(context, e));
    })
  });

  _.each(additionalClickHandlers, (handler, id) => {
    const cb = _.isString(handler) ? e => context[handler](e) : e => handler(e, context);
    $('#' + id).on('click', cb);
  })
}

function renderLegend(legend) {
  let html = '';

  if (legend.nodes && legend.nodes.length) {
    html +=
      `<div class='fg3d-fieldset'><div class='fg3d-fieldset-label'>Entities</div>` +
    (legend.nodes || []).map(type =>
      `<div class='fg3d-legend-item'>
    <div class='fg3d-leg-icon'>
        <div class='fg3d-leg-icon-node shape_${type.shp.toLowerCase()}'
  style='background-color:${type.col}'></div>
    </div>
    <div class='fg3d-leg-txt'>${type.text || '[no title]'}</div>
  </div>`)
      .join('')
    + '</div>'
  }

  if (legend.links && legend.links.length) {
    html += `<div class='fg3d-fieldset'><div class='fg3d-fieldset-label'>Relationships</div>` +
      (legend.links || []).map(type =>
        `<div class='fg3d-legend-item'>
    <div class='fg3d-leg-icon'>
        <div class='fg3d-leg-icon-link' style='border-bottom-width:${type.w || 1}px; border-color:${type.col}'></div>
    </div>
    <div class='fg3d-leg-txt'>${type.text || '[no title]'}</div></div>`)
        .join('')
      + '</div>'
  }

  $('#fg3d-legend-box > .legend-body').html( html );
}

function renderInfobox(selectedNodes, tags) {
  const infoBox = $('#fg3d-info-box-content-container');

  if (selectedNodes && selectedNodes.length) {
    infoBox.html(
      selectedNodes.map(node =>
        `<div class='fg3d-entity-info'><div class='fg3d-info-icon'>`
        + (node.__type === 'node' ?
          `<div class='fg3d-leg-icon-node shape_${node.shp.toLowerCase()}' style='background-color:${node.col}' ></div>` :
          `<div class='fg3d-leg-icon-link' style='border-bottom-width:${node.w ? node.w + 2 : 1}px; border-color:${node.col}'></div>`
        )
        + `</div><p class='fg3d-info-name-p'><b>Name: </b>${node.n}</p>`
        + (!node.tags.length ? '' :
        (`<p class='fg3d-info-name-p'><b>Tags: </b>`
          + _.map(node.tags, tagId => `<span>${tags[tagId].text}</span>`)
            .join(', ')
          + '</p>'))
        + (node.d ? `<p class='fg3d-info-name-p'><b>Description: </b>${node.d}</p>` : '')
        + _.map(node.obj, (value, key) => `<p><b>${key}: </b>${value}</p>`)
          .join('')
        + '</div>',
      )
        .join(''),
    );
  }

  $('#fg3d-info-box').toggle(!!selectedNodes.length);
}

function objectEquals(x, y, _path = '') {
  if (x === y) return false;

  if (!(x instanceof Object) || !(y instanceof Object)) {
    throw new Error('Non-object comparison in ObjectEquals');
  }

  if (x.constructor !== y.constructor) return false;

  for (let p in x) {
    const path = _path + (_path ? '.' : '') + p;

    if (!x.hasOwnProperty(p)) continue;

    if (!y.hasOwnProperty(p)) {
      return path;
    }

    if (x[p] === y[p]) continue;

    if (typeof (x[p]) !== 'object') {
      return path;
    }

    let inside = objectEquals(x[p], y[p], path);

    if (inside) {
      return inside;
    }
  }

  return false;
}

module.exports = {onInterfaceUpdate, renderLegend, bindUiHandlers};
