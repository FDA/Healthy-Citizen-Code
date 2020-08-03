import lodashMap from 'lodash.map';
import lodashReduce from 'lodash.reduce';

export function setStylesFromOptionsToWidgetElement(el, widgetOptions) {
  const rules = {
    'fontFace': v => `font-family: ${v}, Sans-Serif;`,
    'fontSize': v => {
      let fontSize = +v;
      let lineHeight = fontSize * 1.25;

      return `font-size: ${fontSize}px; line-height: ${lineHeight}px;`
    },
    'fontStyle': v => {
      const map = {
        'bold': 'font-weight: bold',
        'italic': 'font-style: italic',
        'underline': 'text-decoration: underline',
        'strikeout': 'text-decoration: line-through'
      };

      return lodashMap(v, rule => map[rule]).join(';');
    }
  };

  let styles = lodashReduce(rules, (result, ruleFn, key) => {
    let option = widgetOptions[key];
    result += option ? ruleFn(option) : '';
    return result;
  }, '');

  el.setAttribute('style', styles);
}
