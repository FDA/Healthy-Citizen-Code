/**
 * Renderers are used to render data for both datatables and server-generated export
 *
 * Each renderer receives this fixed set of parameters:
 * data - the cell data
 * type - type of rendering: filter, display, sort, undefined, etc
 * row - the entire record the data need to be rendered for
 * meta - metainformation in datatables format: https://datatables.net/reference/option/columns.render
 */

// eslint-disable-next-line no-unused-vars
module.exports = appLib => {
  const m = {
    asIs(data) {
      return data;
    },
    googleSearch(data, type, row, meta) {
      const template = '<a href="https://google.com?q=<%= data %>"><%= data %></a>';
      const templateData = { data, row, type, meta };

      return adpRenderLib.getTemplate(template, templateData);
    },
    link(data, type, row, meta) {
      const template = '<a href="<%= data %>"><%= data %></a>';
      const templateData = { data, row, type, meta };

      return adpRenderLib.getTemplate(template, templateData);
    },
    percent(data) {
      let value;
      if (_.isNil(data)) {
        value = '-';
      } else {
        value = `${Math.round(data * 100)}%`;
      }
      return adpRenderLib.getTemplate('<span><%= val %></span>', { val: value });
    },
  };
  return m;
};
