import hcWidgetCss from '../../css/styles.css';

export default function setStyles(iframe) {
  const document = iframe.contentWindow.document;
  const styleNode = document.createElement('style');
  const head = document.head || document.getElementsByTagName('head')[0];

  // set <style>
  styleNode.appendChild(document.createTextNode(hcWidgetCss));
  head.appendChild(styleNode);
}