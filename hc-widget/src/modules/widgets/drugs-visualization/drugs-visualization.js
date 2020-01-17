import { updateIframeHeight, showErrorToUser } from '../../../lib/utils/utils';
import tpl from './drugs-visualization.hbs';
import $ from '../../../lib/utils/dom';

import { getDrugsRelations } from './api';
import { linkDrugs } from './drugs-linker';
import { renderDrugInteractions } from './simulation-view/render';
import { ResponseError } from '../../../lib/exceptions';

export default class drugsVisualization {
  constructor(node, options) {
    this.$el = $(node);
    this.options = options;

    return getDrugsRelations(options)
      .then(linkDrugs)
      .then(linkedData => this.createWidget(linkedData))
      .catch(err => {
        showErrorToUser(ResponseError.RESPONSE_EMPTY);
        console.error(err);
      });
  }

  createWidget(data) {
    const widgetBody = $(tpl()).get(0);
    const viewport = $('svg', widgetBody).get(0);

    this.$el.append(widgetBody);
    renderDrugInteractions(viewport, data);
    updateIframeHeight();
  }
}
