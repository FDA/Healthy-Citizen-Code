'use strict';

var inherits = require('inherits');

var PropertiesActivator = require('bpmn-js-properties-panel/lib/PropertiesActivator');

var entryFactory = require('bpmn-js-properties-panel/lib/factory/EntryFactory'),
  getBusinessObject = require('bpmn-js/lib/util/ModelUtil').getBusinessObject,
  utils = require('bpmn-js-properties-panel/lib/Utils'),
  cmdHelper = require('bpmn-js-properties-panel/lib/helper/CmdHelper');

function createGeneralTabGroups(
    element, canvas, bpmnFactory,
    elementRegistry, translate) {

  var generalGroup = {
    id: 'general',
    label: translate('Test section'),
    entries: []
  };

generalGroup.entries.push(
  entryFactory.textBox({
    id: 'expression',
    label: translate('Expression'),
    modelProperty: 'expression',
    getProperty: function(element) {
      return getBusinessObject(element).expression;
    },
    setProperty: function(element, properties) {

      element = element.labelTarget || element;

      return cmdHelper.updateProperties(element, properties);
    },
  })
);

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
