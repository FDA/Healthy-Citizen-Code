/**
 * Renderers are used to render data for both datatables and server-generated export
 * WARNING: avoid using ES6 in this file as it will be used both on back and frontend.
 *
 * Each renderer receives this fixed set of parameters:
 * data - the cell data
 * type - type of rendering: filter, display, sort, undefined, etc
 * row - the entire record the data need to be rendered for
 * meta - metainformation in datatables format: https://datatables.net/reference/option/columns.render
 */

module.exports = function () {
    var m = {
        "googleSearch": function (data, type, row, meta) {
            var template = '<a href="https://google.com?q=<%= data %>"><%= data %></a>';
            var templateData = {data: data, row: row, type: type, meta: meta};

            return adpRenderLib.getTemplate(template, templateData);
        },
        "link": function(data, type, row, meta) {
            var template = '<a href="<%= data %>"><%= data %></a>';
            var templateData = {data: data, row: row, type: type, meta: meta};

            return adpRenderLib.getTemplate(template, templateData);
        },
        "percent": function(data, type, row, meta) {
            return adpRenderLib.getTemplate('<span><%= val*100 %>%</span>', {val: data});
        }
    };
    return m;
};