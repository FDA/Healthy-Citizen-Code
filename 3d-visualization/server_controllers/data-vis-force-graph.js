const _ = require('lodash');
const commons = require('../lib/src/data_vis_common');

module.exports = function () {
  const m = {};

  m.init = (appLib) => {
    m.appLib = appLib;
    appLib.addRoute('get', '/getFdaVipFgData', [
      appLib.isAuthenticated,
      (req, res) =>
        commons
          .getDbData(m.appLib, req)
          .then((data) => m.transformToFgJson(data))
          .then((config) => res.json(config)),
    ]);
  };

  m.transformToFgJson = (relationships) => {
    const nodes = {};
    const links = [];
    const legend = { nodes: {}, links: [] };
    const tags = {};
    const entitySchema = m.appLib.appModel.models.entities;

    _.each(relationships, (r) => {
      // arrow will be shown from domain entity to range entity: domain -> range
      _.each(['range', 'domain'], (_subj) => {
        const subj = r[_subj];
        if (!subj) {
          return;
        }

        const id = subj._id;
        if (id && !nodes[id]) {
          const node = {
            id,
            n: subj.name,
            tags: getSubjectTags(subj.tags),
            d: clearSomeTags(subj.description || '').replace(/\n/g, ' '),
            col: _.get(subj, 'type.nodeColor'),
            size: getOwnOrTypeAttribute(subj, 'nodeSize'),
            shp: _.get(subj, 'type.nodeShape'),
            obj: getObjAnnotations(subj, entitySchema),
            crtd: new Date(subj.createdAt).getTime() / 1000,
            uptd: new Date(subj.updatedAt).getTime() / 1000,
          };
          const typeName = _.get(subj, 'type.name');

          if (!legend.nodes[typeName]) {
            legend.nodes[typeName] = { text: typeName, col: node.col, shp: (node.shp || 'sphere').toLowerCase() };
          }

          nodes[id] = node;
        }
      });

      if (_.get(r, 'domain._id') && _.get(r, 'range._id')) {
        const particleSize = parseInt(getOwnOrTypeAttribute(r, 'particleSize'));
        const link = {
          n: r.name,
          tags: getSubjectTags(r.tags),
          d: clearSomeTags(r.description || '').replace(/\n/g, ' '),
          source: r.domain._id,
          target: r.range._id,
          col: _.get(r, 'type.linkColor'),
          w: _.get(r, 'type.linkWidth'),
          dst: getOwnOrTypeAttribute(r, 'linkDistance'),
          pw: _.isNaN(particleSize) ? 1 : Math.max(particleSize, 0),
          pw1: r.particleSize,
          pw1type: typeof r.particleSize,
          pcol: _.get(r, 'type.particleColor'),
          pspd: getOwnOrTypeAttribute(r, 'particleSpeed'),
          trf: getOwnOrTypeAttribute(r, 'trafficIntensity'),
          curv: getOwnOrTypeAttribute(r, 'linkCurvature'),
          fsize: _.get(r, 'type.fontSize'),
          obj: {
            Domain: _.get(r, 'domain.name'),
            Type: _.get(r, 'type.name'),
            Range: _.get(r, 'range.name'),
          },
          crtd: new Date(r.createdAt).getTime(),
          uptd: new Date(r.updatedAt).getTime(),
        };
        const typeName = link.obj.Type;

        if (!legend.links[typeName]) {
          legend.links[typeName] = { text: typeName, col: link.col, w: link.w ? link.w + 2 : 1 };
        }

        links.push(link);
      }
    });

    const bytextSorter = (a, b) => (a.text ? a.text.localeCompare(b.text) : 1);

    return {
      legend: {
        nodes: _.values(legend.nodes).sort(bytextSorter),
        links: _.values(legend.links).sort(bytextSorter),
      },
      tags: _.map(_.values(tags), (tag, index) => ({ id: index, text: tag })).sort(bytextSorter),
      nodes: _.values(nodes),
      links,
    };

    function getObjAnnotations(obj, schema) {
      const annotations = {};
      const ignoredFields = ['name', 'tags', '_id', 'description', 'creator', 'deletedat', 'createdat', 'updatedat'];

      _.each(obj, (val, fieldName) => {
        const fieldSchema = schema.fields[fieldName];

        if (ignoredFields.includes(fieldName.toLowerCase()) || !fieldSchema || val === undefined || val == null) {
          return;
        }
        const label = val.fullName || _.startCase(fieldName);

        if (fieldName === 'type') {
          annotations[label] = val.name;
        } else {
          annotations[label] = commons.getVal(obj, fieldName, schema);
        }
      });

      return annotations;
    }

    function getSubjectTags(_tags) {
      if (!_tags || !_tags.length) {
        return [];
      }

      _.each(_tags, (tag) => {
        tags[tag._id] = tag.label;
      });

      const ids = _.keys(tags);

      return _.map(_tags, (tag) => _.indexOf(ids, `${tag._id}`));
    }

    function clearSomeTags(text) {
      return text.replace(/<(\/?)(\w+)([^>]*)>/g, (match, close, tag, rest) => {
        const isAllowed = tag.match(/^(b|i|u|ul|ol|li|a|img|hr|table|tbody|thead|tr|td|th|br)$/);
        return (isAllowed ? '<' : '&lt;') + close + tag + rest + (isAllowed ? '>' : '&gt;');
      });
    }

    function getOwnOrTypeAttribute(node, attrName) {
      var own = node[attrName];

      if (_.isUndefined(own) || _.isNull(own)) {
        return _.get(node, 'type.' + attrName)
      } else {
        return own;
      }
    }
  };

  return m;
};
