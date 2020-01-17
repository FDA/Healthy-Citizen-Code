import React, {createElement} from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text
} from 'react-native';
import {
  Col,
  Row,
  Grid
} from 'native-base';
import _ from 'lodash';
import logger from '../../../../services/logger';
import {getAbsoluteUrl} from '../../../../helpers/fetch';
import ProportionalImage from '../../../../components/ProportionalImage';
import styles from './TemplateGeneratorStyles';
import Chart from '../../../../components/Chart';


const TemplateGenerator = ({item, template, data}) => {
  const re = /<%(.+?)%>/g;
  const reExp = /(^( )?(var|let|const|if|else|for|switch|case|break|{|}|;))(.*)?/g;
  const reElement = /(<([^>]+)>)/ig;

  const components = {
    'string': (children, args, params) => {
      if (['string', 'subtitle', 'fraction', 'center'].indexOf(params.parent.type) > -1) {
        return children;
      }

      let specificStyles = {
        color: item.color
      };

      const parentIsCircle = params.parent.type === 'circle';
      if (parentIsCircle) {
        specificStyles = {
          ...specificStyles,
          color: '#fff',
          paddingVertical: 0,
          paddingHorizontal: 0
        }
      }

      if (['circle', 'column'].indexOf(params.parent.type) > -1) {
        specificStyles = {
          ...specificStyles,
          alignSelf: 'center'
        }
      }

      if (args.hasOwnProperty('border')) {
        specificStyles = {
          ...specificStyles,
          borderColor: item.color,
          borderWidth: 1,
          alignSelf: 'flex-start'
        }
      }

      if (args.hasOwnProperty('center')) {
        specificStyles = {
          ...specificStyles,
          // alignSelf: 'stretch',
          // textAlign: 'center'
        }
      }

      return {
        type: Text,
        props: {
          style: [
            styles.text,
            specificStyles
          ]
        },
        children: children
      };
    },
    'subtitle': (children, args) => {
      let specificStyles = {
        color: item.color
      };

      return {
        type: Text,
        props: {
          style: [
            styles.subtitle,
            specificStyles
          ]
        },
        children: children
      }
    },
    'list': (children) => ({
      type: View,
      props: {
        style: styles.list
      },
      children: children
    }),
    'list-item': (children) => ({
      type: View,
      props: {
        style: styles.listItem
      },
      children: [
        {
          type: View,
          props: {
            style: [
              styles.listItemCircle,
              {
                backgroundColor: item.color
              }
            ]
          }
        },
        {
          type: View,
          props: {
            style: [
              styles.listItemLine,
              {
                backgroundColor: item.color
              }
            ]
          }
        }
      ].concat(children)
    }),
    'grid': (children, args) => ({
      type: Grid,
      props: {
        style: styles.grid
      },
      children: children
    }),
    'column': (children, args) => ({
      type: Col,
      props: {
        style: styles.column
      },
      children: children
    }),
    'row': (children, args) => ({
      type: Row,
      props: {
        style: styles.row
      },
      children: children
    }),
    'circle': (children, args, params) => {
      const parentIsColumn = params.parent.type === 'column';

      return {
        type: View,
        props: {
          style: [
            styles.circle,
            parentIsColumn ? styles.circleInColumn : null,
            {
              backgroundColor: item.color
            }
          ]
        },
        children: children
      };
    },
    'fraction': (children, args, params) => {
      const fraction = children.split('/');
      const parentIsCircle = params.parent.type === 'circle';

      return {
        type: View,
        props: {
          style: styles.fraction
        },
        children: [
          {
            type: View,
            props: {
              style: styles.numerator
            },
            children: {
              type: Text,
              props: {
                style: [
                  styles.numeratorText,
                  {
                    color: !parentIsCircle ? item.color : '#fff'
                  }
                ]
              },
              children: fraction[0]
            }
          },
          {
            type: View,
            props: {
              style: [
                styles.denominator,
                {
                  borderTopColor: !parentIsCircle ? item.color : '#fff'
                }
              ]
            },
            children: {
              type: Text,
              props: {
                style: [
                  styles.denominatorText,
                  {
                    color: !parentIsCircle ? item.color : '#fff'
                  }
                ]
              },
              children: fraction[1]
            }
          }
        ]
      };
    },
    'image': (children, args) => ({
      type: ProportionalImage,
      props: {
        style: styles.image,
        source: getAbsoluteUrl(args.source)
      }
    }),
    'offset': (children, args) => ({
      type: View,
      props: {
        style: [
          styles.offset,
          {
            height: parseInt(args.size)
          }
        ]
      }
    }),
    /*  'tile': (children, args) => {
        return {
          type: View,
          props: {
            style: [
              styles.item
            ]
          },
          children: {
            type: View,
            props: {
              style: [
                styles.tile
              ],
              children: children
            }
          }
        };
      },
      'tile-x2': (children, args) => {
        return {
          type: View,
          props: {
            style: [
              styles.itemX2
            ]
          },
          children: {
            type: View,
            props: {
              style: [
                styles.tile
              ],
              children: children
            }
          }
        };
      },
      'tile-x3': (children, args) => {
        return {
          type: View,
          props: {
            style: [
              styles.itemX3
            ]
          },
          children: {
            type: View,
            props: {
              style: [
                styles.tile
              ],
              children: children
            }
          }
        };
      },
      'tile-x4': (children, args) => {
        return {
          type: View,
          props: {
            style: [
              styles.itemX4
            ]
          },
          children: {
            type: View,
            props: {
              style: [
                styles.tile
              ],
              children: children
            }
          }
        };
      },
      'tile-header': (children, args) => {
        return {
          type: View,
          props: {
            style: [
              styles.panelHeading
            ]
          },
          children: {
            type: View,
            props: {
              style: [
                styles.panelTitle
              ]
            },
            children: children
          }
        };
      },
      'chart-body': (children, args) => {
        return {
          type: Chart,
          props: {
            style: [
              styles.panelBody
            ]
          },
          children: {
            type: View,
            props: {
              // style: item,
              // conf: data
              'item': 'item',
              'data': 'data'
            },
            children: children
          }
        };
      },
      'tile-body': (children, args) => {
        return {
          type: View,
          props: {
            style: [
              styles.panelBody
            ]
          },
          children: {
            type: View,
            props: {
              'item': 'item',
              'data': 'data'
            },
            children: children
          }
        };
      },
      'tile-footer': (children, args) => {
        return {
          type: View,
          props: {
            style: [
              styles.panelFooter,
              styles.textCapitalize
            ]
          },
          children: {
            // type: 'a',
            type: Text,
            props: {
              // 'class': 'btn btn-default',
              // 'ng-click': 'action(item.parameters.action, item)'
            },
            children: children
          }
        };
      }*/
  };

  const generateTemplate = (template, data = {}) => {
    let cursor = 0;
    let code = 'with(obj) { var r=[];\n';
    let result;
    let match;

    const addLine = (line, js) => {
      if (js) {
        code +=
          line.match(reExp)
            ? line + '\n'
            : 'r.push(' + line + ');\n'
      } else {
        code +=
          line != '' ?
            'r.push("' + line.replace(/"/g, '\\"') + '");\n' :
            ''
      }

      return addLine;
    };

    while (match = re.exec(template)) {
      addLine(template.slice(cursor, match.index))(match[1], true);

      cursor = match.index + match[0].length;
    }

    addLine(template.substr(cursor, template.length - cursor));
    code = (code + 'return r.join(""); }').replace(/[\r\t\n]/g, ' ');

    try {
      result = new Function('obj', code).apply(data, [data]);
    }
    catch (err) {
      logger.error("'" + err.message + "'", " in \n\nCode:\n", code, "\n");
    }

    return result;
  };

  const parseElement = (offset) => {
    let result = {
      type: null,
      args: {},
      isEnd: false,
      withEnd: false
    };

    if (offset.slice(-1) === '/') {
      result.withEnd = true;

      offset = offset.slice(0, -1);
    }

    offset.split(' ').forEach((str, index) => {
      if (index === 0) {
        if (str.charAt(0) === '/') {
          result.isEnd = true;
        }

        result.type = str.replace(/^\//g, '');
      } else {
        const splitArg = str.split('=');

        if (splitArg[0].trim().length) {
          result.args[splitArg[0]] =
            splitArg[1]
              ? splitArg[1].replace(/(^"|"$)/g, '')
              : '';
        }
      }
    });

    return result;
  };

  const parseTemplate = (template) => {
    let cursor = 0;
    let tree = [];
    let currentLink = tree;
    let paths = [currentLink];

    while (match = reElement.exec(template)) {
      if (template.slice(cursor, match.index).trim().length) {
        currentLink.push({
          type: 'string',
          args: {},
          children: template.slice(cursor, match.index)
        });
      }

      const element = parseElement(match[2]);

      if (!element.isEnd) {
        currentLink.push({
          type: element.type.toLowerCase(),
          args: element.args,
          children: []
        });

        currentLink = currentLink[currentLink.length - 1].children;
        paths.push(currentLink);
      }
      if (element.isEnd || element.withEnd) {
        paths.pop();
        currentLink = paths.slice(-1)[0];
      }

      cursor = match.index + match[0].length;
    }

    return tree;
  };

  const generateTemplateObject = (schema, parent) => {
    if (typeof parent === 'undefined') {
      parent = null;
    }

    if (!schema || !schema.length) {
      return null;
    }

    if (typeof schema === 'string') {
      return schema;
    }

    const result = [];

    for (let i = 0; i < schema.length; i++) {
      const _item = schema[i];

      const currentComponent = components[_item.type];

      if (!currentComponent) {
        continue;
      }

      const childrenTemplate = generateTemplateObject(_item.children, _item);
      const renderedComponent = currentComponent(childrenTemplate, _item.args, {
        parent: parent
      });

      if (!renderedComponent) {
        continue;
      }

      result.push(renderedComponent);
    }

    return result.length ? (result.length === 1 ? result[0] : result) : null;
  };

  const generateReactComponents = (component, key = null) => {
    if (!component) {
      return null;
    }

    if (typeof component === 'string') {
      return component;
    }

    if (!Array.isArray(component)) {
      if (typeof component.type === 'undefined') {
        return null;
      }

      return createElement(
        component.type,
        {
          ...component.props,
          key: key
        },
        generateReactComponents(component.children)
      );
    }

    return component.map((child, key) => generateReactComponents(child, key));
  };

  let generated = null;
  // TODO: Define how to distinguish highcharts from other charts properly
  if (item.template.startsWith('<adp-chart')) {
    // hide exporting menu for highcharts
    let config = {exporting: {enabled: false}};
    generated = <Chart
      style={{flex: 1}}
      config={_.merge(config, item.specification || {})}
    />;
  } else {
    generated = generateReactComponents(
      generateTemplateObject(
        parseTemplate(
          generateTemplate(item.template, item.data)
        )
      ), null
    );
  }

  return (
    <View
      style={styles.content}
    >
      {generated}
    </View>
  );
};

TemplateGenerator.propTypes = {
  item: PropTypes.object.isRequired,
  template: PropTypes.string.isRequired,
  data: PropTypes.any
};

export default TemplateGenerator;
