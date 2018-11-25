import Iframe from '../../iframe';
import getDrugsRelations from './data-service';
import createView from './drug-visualization-view';
import tpl from './drugs-visualization.hbs';
import $ from '../../../lib/dom';

export default class drugsVisualization {
  constructor(node, options) {
    this.options = options;
    this.options.events = {
      onLoad: this.onLoad.bind(this)
    };

    new Iframe(node, this.options);
  }

  onLoad(iframe) {
    this.parent = iframe;

    return this.fetchData()
      .then(message => this.createWidget(message))
      .catch(err => {
        console.error(err);
        this.parent.showMessage('Unable to get medications list.');
      });
  }

  fetchData() {
    // TODO: temp fix
    this.options.fhirDataUrl = this.options.stu3Url;
    return getDrugsRelations(this.options);
  }

  createWidget(data) {
    const widgetBody = $(tpl()).get(0);
    const viewport = $('svg', widgetBody).get(0);

    this.parent.append(widgetBody);
    createView(viewport, data);
  }
}
