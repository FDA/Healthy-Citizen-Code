import BpmnJS from 'bpmn-js/lib/Modeler';
import BpmnPropertiesPanelModule from 'bpmn-js-properties-panel';
import BpmnPropertiesProviderModule from './bpmn-properties-provider';

import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-codes.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';

import 'bpmn-js-properties-panel/dist/assets/bpmn-js-properties-panel.css'
import './bpmn-properties-provider/custom-styles.less'

window.BpmnJS = BpmnJS;
window.BpmnPropertiesPanelModule = BpmnPropertiesPanelModule;
window.BpmnPropertiesProviderModule = BpmnPropertiesProviderModule;
