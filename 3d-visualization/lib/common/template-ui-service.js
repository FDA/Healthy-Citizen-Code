const localConfig = {};
const linkModelToControl = {};

function getInterfaceUpdater(params) {
  return vm => {
    let i = 0;

    while (i < 100) {
      let path = objectEquals(vm.config, localConfig);

      if (path) {
        _.set(localConfig, path, _.get(vm.config, path));

        linkModelToControl[path] && linkModelToControl[path](vm);
      } else {
        break;
      }
      i++;
    }

    renderInfobox(vm, params && params.nodeInfoAddInfo);
  }
}

function bindUiHandlers(context, params) {
  const getLink = {
    modelToCheckbox: (name, configObject = 'config') => vm => $('#fg3d-' + name)
      .prop('checked', vm[configObject][name]),
    modelToInput: (name, configObject = 'config') => vm => $('#fg3d-' + name)
      .val(vm[configObject][name]),
    checkboxToModel: (name, configObject = 'config') => (vm, e) => {
      localConfig[name] = vm[configObject][name] = e.target.checked;
      vm.doRefreshGraph();
    },
    inputToModel: (name, configObject = 'config') => (vm, e) => {
      localConfig[name] = vm[configObject][name] = e.target.value;
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
  const interfaceUpdater = getInterfaceUpdater(params);
  const biDirectionalLinkConfig = {
    showOptions: {
      model: vm => {
        $('.fg3d-left-panel-block.fg3d-config').toggleClass('open', vm.config.showOptions);
        $('#fg3d-left-panel').toggleClass('both-open', vm.config.showOptions && vm.config.showLegend);
      },
      events: {
        '#fg3d-config-icon,.fg3d-config .fg3d-close:click': vm => {
          vm.toggleConfig();
          interfaceUpdater(vm);
        },
      },
    },
    showLegend: {
      model: vm => {
        $('.fg3d-left-panel-block.fg3d-legend').toggleClass('open', vm.config.showLegend);
        $('#fg3d-left-panel').toggleClass('both-open', vm.config.showOptions && vm.config.showLegend);
      },
      events: {
        '#fg3d-legend-icon,.fg3d-legend .fg3d-close:click': (vm, e) => {
          vm.toggleLegend(e);
          interfaceUpdater(vm);
        },
      },
    },
    hlLabelNodes: 'Checkbox',
    hlLabelLinks: 'Checkbox',
    highlightAdjacent: 'Checkbox',
    hlColorize: 'Input',
    hlBrightness: 'Input',
    hlGlow: 'Input',
    hlDim: 'Input',
    labelLinks: 'Checkbox',
    labelNodes: 'Checkbox',
    animCamera: {
      model: getLink.modelToCheckbox('animCamera'),
      events: {
        '#fg3d-animCamera:click': (vm, e) => {
          getLink.checkboxToModel('animCamera')(vm, e);
          vm.toggleCameraOrbit();
        },
      },
    },
    fixDragged: 'Checkbox',
    linkCurvature: 'Input',
    linkDistance: {
      model: getLink.modelToInput('linkDistance'),
      events: {
        '#fg3d-linkDistance:change': (vm, e) => {
          getLink.inputToModel('linkDistance')(vm, e);
          vm.reheatSimulation();
        },
        '#fg3d-linkDistance:keyup': (vm, e) => {
          getLink.inputToModel('linkDistance')(vm, e);
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
    perfMonitor: {
      model: getLink.modelToCheckbox('show', 'performanceMonitor'),
      events: {
        '#fg3d-perfMonitor:click': (vm, e) => {
          getLink.checkboxToModel('show', 'performanceMonitor')(vm, e);
          vm.performanceMonitor.toggle();
          $('#fg3d-performance-monitor').toggle(vm.performanceMonitor.show);
        },
      },
    },
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
        <div class='fg3d-leg-icon-node shape_${(type.shp || 'sphere').toLowerCase()}'
  style='background-color:${type.col || "white"}'></div>
    </div>
    <div class='fg3d-leg-txt' title='${type.text || ""}'>${type.text || '[no title]'}</div>
  </div>`)
        .join('')
      + '</div>'
  }

  if (legend.links && legend.links.length) {
    html += `<div class='fg3d-fieldset'><div class='fg3d-fieldset-label'>Relationships</div>` +
      (legend.links || []).map(type =>
        `<div class='fg3d-legend-item'>
    <div class='fg3d-leg-icon'>
        <div class='fg3d-leg-icon-link' style='border-bottom-width:${type.w || 1}px; border-color:${type.col || "white"}'></div>
    </div>
    <div class='fg3d-leg-txt' title='${type.text || ""}'>${type.text || '[no title]'}</div></div>`)
        .join('')
      + '</div>'
  }

  if (html) {
    $('#fg3d-legend-box .legend-body').html(html);
  } else {
    $('.fg3d-legend').hide();
  }
}

function renderInfobox(vm, specialRenderer) {
  const {selectedNodes} = vm;
  const infoBox = $('#fg3d-info-box-content-container');
  const addRenderer = _.isFunction(specialRenderer) ? specialRenderer : () => '';

  if (selectedNodes && selectedNodes.length) {
    infoBox.html(
      selectedNodes.map(node =>
        `<div class='fg3d-entity-info'><div class='fg3d-info-icon'>`
        + (node.__type === 'node' ?
          `<div class='fg3d-leg-icon-node shape_${node.shp.toLowerCase()}' style='background-color:${node.col}' ></div>` :
          `<div class='fg3d-leg-icon-link' style='border-bottom-width:${node.w ? node.w + 2 : 1}px; border-color:${node.col}'></div>`
        )
        + (node.n ? `</div><p class='fg3d-info-name-p'><b>Name: </b>${node.n}</p>` : '')
        + (node.tags && node.tags.length ?
        (`<p class='fg3d-info-name-p'><b>Tags: </b>` + vm.getTagNamesByIds(node.tags) + '</p>') : '')
        + (node.d ? `<p class='fg3d-info-name-p'><b>Description: </b>${node.d}</p>` : '')
        + _.map(node.obj, (value, key) => `<p><b>${key}: </b>${_.isNull(value) ? 'N/A' : value}</p>`)
          .join('')
        + (node.createdAt ? `<p class='fg3d-info-name-p'><b>Created at: </b>${node.createdAt}</p>` : '')
        + (node.updatedAt ? `<p class='fg3d-info-name-p'><b>Updated at: </b>${node.updatedAt}</p>` : '')
        + addRenderer(node)
        + '</div>',
      )
        .join(''),
    );
  }

  $('#fg3d-info-box').toggle(!!selectedNodes.length);
}

function reportFatalError(error_message) {
  if (error_message) {
    $('#fg3d-container')
      .addClass('adp-fatal-error')
      .text(error_message);
  }
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

module.exports = {getInterfaceUpdater, renderLegend, bindUiHandlers, reportFatalError};
