import Iframe from '../../iframe';
import hcWidgetAPI from '../../api';
import $ from '../../../lib/dom';
import Table from '../../../modules/table/table';
import adverseEventsTemplate from './adverse-events.hbs';
import { formatEvents } from './adverse-events.helpers'

export default class AdverseEvents {
  constructor(node, options) {
    this.options = options;
    this.options.events = {
      onLoad: this.onIframeLoad.bind(this)
    };

    new Iframe(node, options);
  }

  onIframeLoad(iframe) {
    this.parent = iframe;
    this.$loader = $('<div class="loader-wrap"><div class="loader"></div></div>');
    this.parent.append(this.$loader);

    this.fetchData()
      .catch(err => {
        console.error(err);
        this.parent.showMessage(err.message);
      });
  }

  fetchData() {
    const patientData = {
      age: this.options.age,
      gender: this.options.gender
    };

    return hcWidgetAPI.getAdverseEvents(this.options.fhirDataUrl, this.options.fhirId, patientData)
      .then(data => {
        this.$loader.remove();

        if (data.length) {
          this.buildTable(data);
        } else {
          throw new Error('Unable to get adverse events.');
        }
      });
  }

  heads(data) {
    for (let i = 0; i < data.length; i++) {
      if (data[i].list.length) {
        return Object.keys(data[i].list[0])
      }
    }
  }

  buildTable(medications) {
    const data = formatEvents(medications);
    const heads = this.heads(data);

    const widgetBody = $(adverseEventsTemplate());
    const table = new Table({
      heads, data,
      groupTitle: 'Total number of adverse events:',
      hasGrouping: true,
      accordion: true
    });

    table.appendTo(widgetBody);
    this.parent.append(widgetBody);
  }
}
