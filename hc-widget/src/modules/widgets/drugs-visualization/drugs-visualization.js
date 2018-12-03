import getDrugsRelations from './data-service';
import createView from './drug-visualization-view';
import {updateIframeHeight, widgetError} from '../../../lib/utils';

import tpl from './drugs-visualization.hbs';
import $ from '../../../lib/dom';

export default class drugsVisualization {
  constructor(node, options) {
    this.$el = $(node);
    this.options = options;

    return this.fetchData()
      .then(message => this.createWidget(message))
      .catch(err => {
        widgetError('Unable to get medications list.');
        console.error(err);
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

    this.$el.append(widgetBody);
    createView(viewport, data);
    updateIframeHeight();
  }
}
