import iframeWidget from './util/iframeWidget';

// export widget for usage outside
window['hcWidget'] = iframeWidget;

(function initWidgetFromDOM() {
  const widgets = document.querySelectorAll('[hc-widget]');

  for (let i = 0; i < widgets.length; i++) {
    let node = widgets[i];
    iframeWidget(node, node.dataset);
  }
})();