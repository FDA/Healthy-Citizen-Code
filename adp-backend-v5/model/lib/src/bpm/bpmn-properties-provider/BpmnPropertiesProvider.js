'use strict';

var inherits = require('inherits');
var PropertiesActivator = require('bpmn-js-properties-panel/lib/PropertiesActivator');
var getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject;
var cmdHelper = require('bpmn-js-properties-panel/lib/helper/CmdHelper');
var scriptImplementation = require('./parts/implementation/AdpScript');

function createGeneralTabGroups(element, canvas, bpmnFactory, elementRegistry, translate) {
  var generalGroup = {
    id: 'general',
    label: translate('Test section'),
    entries: []
  };

  var bo = getBusinessObject(element);

  if (!bo) {
    return;
  }

  var script = scriptImplementation( 'script', false, translate);
  generalGroup.entries.push({
    id: 'script-implementation',
    label: translate('Script'),
    html: script.template,

    get: function(element) {
      return script.get(element, bo);
    },

    set: function(element, values, containerElement) {
      var properties = script.set(element, values, containerElement);
      properties.scriptFormat="Javascript";
      if(element.type==='bpmn:Process') {
        properties.isExecutable=true;
      }
      return cmdHelper.updateProperties(element, properties);
    },

    script : script,
    cssClasses: ['bpp-textfield']
  });

  return [
    generalGroup
  ];
}

function BpmnPropertiesProvider(
    eventBus, canvas, bpmnFactory, elementRegistry, translate) {

  PropertiesActivator.call(this, eventBus);

  this.getTabs = function(element) {

    var generalTab = {
      id: 'general',
      label: translate('Conceptant'),
      groups: createGeneralTabGroups(
        element, canvas, bpmnFactory, elementRegistry, translate)
    };

    return [
      generalTab
    ];
  };
}

BpmnPropertiesProvider.$inject = [
  'eventBus',
  'canvas',
  'bpmnFactory',
  'elementRegistry',
  'translate'
];

inherits(BpmnPropertiesProvider, PropertiesActivator);

module.exports = BpmnPropertiesProvider;
