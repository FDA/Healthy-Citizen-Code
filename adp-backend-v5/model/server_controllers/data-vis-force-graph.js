const _ = require('lodash');
const commons = require('../lib/src/data_vis_common');

module.exports = function() {
  const m = {};

  m.init = appLib => {
    m.appLib = appLib;
    appLib.addRoute('get', '/getFdaVipFgData', [
      appLib.isAuthenticated,
      (req, res) =>
        commons
          .getDbData(m.appLib, req)
          .then(data => m.transformToFgJson(data))
          .then(config => res.json(config)),
    ]);
  };

  m.transformToFgJson = relationships => {
    const nodes = {};
    const links = [];
    const legend = { nodes: {}, links: [] };
    const tags = {};
    const entitySchema = m.appLib.appModel.models.entities;

    _.each(relationships, r => {
      // arrow will be shown from domain entity to range entity: domain -> range
      _.each(['range', 'domain'], _subj => {
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
            col: _.get(subj, 'type.nodeColor'),
            size: subj.entitySize || _.get(subj, 'type.nodeSize'),
            shp: _.get(subj, 'type.nodeShape'),
            obj: getObjAnnotations(subj, entitySchema),
          };
          const typeName = _.get(subj, 'type.name');

          if (!legend.nodes[typeName]) {
            legend.nodes[typeName] = { text: typeName, col: node.col, shp: (node.shp || 'sphere').toLowerCase() };
          }

          nodes[id] = node;
        }
      });

      if (_.get(r, 'domain._id') && _.get(r, 'range._id')) {
        const link = {
          n: r.name,
          tags: getSubjectTags(r.tags),
          source: r.domain._id,
          target: r.range._id,
          col: _.get(r, 'type.linkColor'),
          w: _.get(r, 'type.linkWidth'),
          dst: r.linkDistance || _.get(r, 'type.linkDistance'),
          pw: r.particleSize || _.get(r, 'type.particleSize'),
          pcol: _.get(r, 'type.particleColor'),
          pspd: r.particleSpeed || _.get(r, 'type.particleSpeed'),
          trf: r.trafficIntensity || _.get(r, 'type.trafficIntensity'),
          curv: r.linkCurvature || _.get(r, 'type.linkCurvature'),
          fsize: _.get(r, 'type.fontSize'),
          obj: {
            Domain: _.get(r, 'domain.name'),
            Type: _.get(r, 'type.name'),
            Range: _.get(r, 'range.name'),
          },
        };
        const typeName = link.obj.Type;

        if (!legend.links[typeName]) {
          legend.links[typeName] = { text: typeName, col: link.col, w: link.w ? link.w + 2 : 1 };
        }

        links.push(link);
      }
    });

    return {
      legend: {
        nodes: _.values(legend.nodes),
        links: _.values(legend.links),
      },
      tags: _.values(tags),
      nodes: _.values(nodes),
      links,
    };

    function getObjAnnotations(obj, schema) {
      const annotations = {};
      const ignoredFields = ['name', 'tags', '_id', 'creator'];

      _.each(obj, (val, fieldName) => {
        const fieldSchema = schema.fields[fieldName];

        if (
          ignoredFields.includes(fieldName.toLowerCase()) ||
          !fieldSchema ||
          !fieldSchema.showInViewDetails ||
          val === undefined ||
          val == null
        ) {
          return;
        }
        const label = val.fullName || _.startCase(fieldName);

        annotations[label] = fieldName === 'type' ? val.name : commons.getVal(obj, fieldName, schema);
      });

      return annotations;
    }

    function getSubjectTags(_tags) {
      if (!_tags || !_tags.length) {
        return [];
      }

      _.each(_tags, tag => {
        tags[tag._id] = tag.label;
      });

      const ids = _.keys(tags);

      return _.map(_tags, tag => _.indexOf(ids, `${tag._id}`));
    }
  };

  return m;
};
