import * as d3 from 'd3';
import { wrapText } from './helpers';
import styles from './style.css';

// TODO: responsiveness in iframe ???
// TODO: add click events and labels for nodes
// TODO: add subtypes

// TODO: remove all magic numbers
// TODO: add Classes, objDrugsFont
// TODO: add types of nodes
// TODO: node borders borderStyle
// TODO: draw line types
// TODO: linkLabels drag

// TODO: draw bendable links
// TODO: borderClass: "objDrugsBorder"
// TODO: eval params

const TEMP_RECT_WIDTH = 120;
const TEMP_RECT_HEIGHT = 30;

const graph = {};
const selected = {};
let highlighted = null;

export function renderDrugInteractions(viewportNode, { nodes, links }) {
  const svg = d3.select(viewportNode).attr('class', styles.root);
  const WIDTH = +svg.attr('width');
  const HEIGHT = +svg.attr('height');

  const appContainer = svg.append('g').attr('class', 'app-container');

  const simulation = setupSimulation(svg);
  const link = createLinks(appContainer, links);
  const linkLabel = createLinkLabels(appContainer, links);
  const node = createNodes(appContainer, nodes, simulation);

  const zoom = d3.zoom().on('zoom', () => {
    appContainer.attr('transform', d3.event.transform);
  });

  svg.call(zoom).call(zoom.transform, d3.zoomIdentity.translate(WIDTH / 2, HEIGHT / 2).scale(0.2, 0.2));

  node.call(drag(simulation));

  simulation.nodes(nodes).on('tick', () => onTick(link, node, linkLabel));

  simulation.force('link').links(links);

  events(svg);
}

function setupSimulation(svg) {
  const forceLink = d3.forceLink();
  const WIDTH = +svg.attr('width');
  const HEIGHT = +svg.attr('height');

  const chargeForce = d3
    .forceManyBody()
    .strength(node => node.strength())
    .distanceMin(node => node.distanceMin());

  const simulation = d3
    .forceSimulation()
    .force('link', forceLink.id(link => link.id))
    .force('distance', forceLink.distance(link => link.distance()))
    .force('charge', chargeForce)
    // temp hardcode: experimentaly evaluated
    .force('center', d3.forceCenter(WIDTH / 2, HEIGHT / 2));

  return simulation;
}

function createNodes(svg, nodes) {
  const selection = svg
    .append('g')
    .attr('class', 'nodes-container')
    .selectAll('nodes-container')
    .data(nodes)
    .enter()
    .append('g')
    .attr('class', node => `node-group group-${node.groupId()}`);

  selection
    .append('circle')
    .attr('class', node => `${node.prop('cssObjClass')} node`)
    .attr('r', node => node.prop('radius'))
    .attr('fill', node => node.prop('fill'))
    .attr('stroke', node => node.prop('stroke'))
    .attr('stroke-width', node => node.prop('strokeWidth'));

  selection
    .append('text')
    .attr('class', node => `${node.prop('cssObjTextClass')} node-text`)
    .attr('text-anchor', node => node.prop('textAnchor'))
    .text(node => {
      if (node.label.length > 15) {
        return `${node.label.substr(0, 15).trim()}...`;
      }
      return node.label;
    })
    .call(wrapText);

  return selection;
}

function createLinks(appView, links) {
  graph.line = appView
    .append('g')
    .attr('class', 'links-container')
    .selectAll('line')
    .data(links)
    .enter()
    .append('line')
    .attr('class', link => `link group-${link.groupId()}`)
    .attr('stroke', link => link.prop('stroke'))
    .attr('stroke-width', link => link.prop('strokeWidth'));

  return graph.line;
}

function createLinkLabels(appView, links) {
  const selection = appView
    .append('g')
    .attr('class', 'links-label-container')
    .selectAll('links-label-container')
    .data(links)
    .enter()
    .append('g')
    .attr('class', link => `label-group group-${link.groupId()}`);

  selection
    .append('rect')
    .attr('class', 'label-rect')
    .attr('width', TEMP_RECT_WIDTH)
    .attr('height', TEMP_RECT_HEIGHT)
    .attr('fill', link => link.prop('rectFill'))
    .attr('stroke', link => link.prop('rectStroke'))
    .attr('stroke-width', '2');

  selection
    .append('text')
    .attr('class', 'label-text')
    .attr('text-anchor', 'middle')
    .attr('alignment-baseline', 'middle')
    .text(link => {
      if (link.label().length > 15) {
        return `${link
          .label()
          .substr(0, 15)
          .trim()}...`;
      }
      return link.label();
    });

  graph.linkLabel = selection;
  return selection;
}

function onTick(currentLink, node, linkLabel) {
  const rectCoords = (source, target) => {
    const x = (source.x + target.x) / 2 - TEMP_RECT_WIDTH / 2;
    const y = (source.y + target.y) / 2 - TEMP_RECT_HEIGHT / 2;

    return { x, y };
  };

  currentLink
    .attr('x1', l => l.source.x)
    .attr('y1', l => l.source.y)
    .attr('x2', l => l.target.x)
    .attr('y2', l => l.target.y);

  node.attr('transform', n => {
    return `translate(${n.x}, ${n.y})`;
  });

  node.selectAll('.node-text').attr('transform', `translate(0, 6)`);

  linkLabel.attr('transform', link => {
    const coords = rectCoords(link.source, link.target);
    return `translate(${coords.x}, ${coords.y})`;
  });

  // positioning inside of group
  linkLabel.selectAll('.label-text').attr('transform', `translate(${TEMP_RECT_WIDTH / 2}, ${TEMP_RECT_HEIGHT / 2})`);
}

function drag(simulation) {
  return d3
    .drag()
    .on('start', d => dragstarted(d, simulation))
    .on('drag', dragged)
    .on('end', d => dragended(d, simulation));
}

function dragstarted(d, simulation) {
  if (!d3.event.active) {
    simulation.alphaTarget(0.3).restart();
  }

  d.fx = d.x;
  d.fy = d.y;
}

function dragged(d) {
  d.fx = d3.event.x;
  d.fy = d3.event.y;
}

function dragended(d, simulation) {
  if (!d3.event.active) {
    simulation.alphaTarget(0);
  }

  d.fx = null;
  d.fy = null;
}

function events(svg) {
  let mouseEntered = false;

  function onMouseEnter(data) {
    if (mouseEntered) {
      return;
    }

    svg
      .selectAll(`.group-${data.groupId()}`)
      .select('.node-text')
      .text(node => node.label)
      .call(wrapText);

    mouseEntered = true;
  }

  function onMouseLeave(data) {
    svg
      .selectAll(`.group-${data.groupId()}`)
      .select('.node-text')
      .text(node => {
        if (node.label.length > 15) {
          return `${node.label.substr(0, 15).trim()}...`;
        }
        return node.label;
      })
      .call(wrapText);

    mouseEntered = false;
  }

  svg
    .selectAll('.label-group, .node-group')
    .on('mouseenter', onMouseEnter)
    .on('mouseleave', onMouseLeave);

  // from https://nylen.io/d3-process-map/graph.php
  graph.node = svg
    .selectAll('.node,.node-text')
    .on('mouseover', function(d) {
      if (!selected.obj) {
        if (graph.mouseoutTimeout) {
          clearTimeout(graph.mouseoutTimeout);
          graph.mouseoutTimeout = null;
        }
        highlightObject(d);
      }
    })
    .on('mouseout', function() {
      if (!selected.obj) {
        if (graph.mouseoutTimeout) {
          clearTimeout(graph.mouseoutTimeout);
          graph.mouseoutTimeout = null;
        }
        graph.mouseoutTimeout = setTimeout(function() {
          highlightObject(null);
        }, 100);
      }
    });
}

function highlightObject(obj) {
  if (obj) {
    if (obj !== highlighted) {
      graph.node.classed('inactive', function(d) {
        return (
          obj !== d &&
          !d.depends.includes(obj.id) &&
          !d.dependedOnBy.includes(obj.id) &&
          !obj.depends.includes(d.id) &&
          !obj.dependedOnBy.includes(d.id)
        );
      });
      graph.line.classed('inactive', function(d) {
        return obj !== d.source && obj !== d.target;
      });
      graph.linkLabel.classed('inactive', function(d) {
        return obj.id !== d.source.id && obj.id !== d.target.id;
      });
    }
    highlighted = obj;
  } else {
    if (highlighted) {
      graph.node.classed('inactive', false);
      graph.line.classed('inactive', false);
      graph.linkLabel.classed('inactive', false);
    }
    highlighted = null;
  }
}
