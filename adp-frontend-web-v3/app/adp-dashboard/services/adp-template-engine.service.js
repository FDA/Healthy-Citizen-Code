;(function() {
  'use strict';
  
  angular
    .module('app.adpDashboard')
    .factory('adpTemplateEngineService', adpTemplateEngineService);
  
  
  function adpTemplateEngineService($rootScope, CONSTANTS) {
    
    function getAbsoluteUrl(url) {
      return url.charAt(0) === '/' ? CONSTANTS.apiUrl + url : url;
    }
    
    function getImageUrl(src) {
      var imageSource = src;
      
      if ($rootScope.isIE) {
        imageSource = imageSource.split('.').join('IE.');
      }
      
      // return 'background-image:url(' + getAbsoluteUrl(imageSource) + ')';
      return getAbsoluteUrl(imageSource);
    }
    
    function TemplateGenerator(template, color, data) {
      var re = /<%(.+?)%>/g;
      var reExp = /(^( )?(var|let|const|if|else|for|switch|case|break|{|}|;))(.*)?/g;
      var reElement = /(<([^>]+)>)/ig;
      
      var components = {
        'no-data': function (children, args) {
          return {
            type: 'div',
            props: {
              'class': 'noData'
            },
            children: children
          };
        },
        'string': function (children, args, params) {
          if (params.parent && ['string', 'subtitle', 'fraction', 'center'].indexOf(params.parent.type) > -1) {
            return children;
          }

          var styles = [];
          
          if (args.hasOwnProperty('border')) {
            styles.push('border-color: ' + color);
          }

          return {
            type: 'p',
            props: {
              'class': 'dashboard__p' +
              (args.hasOwnProperty('center') ? ' dashboard__p--center' : '') +
              (args.hasOwnProperty('centered-number') ? ' dashboard__p--centered-number' : ''),
              'style': styles.join('; ')
            },
            children: children
          };
        },
        'subtitle': function (children, args) {
          return {
            type: 'h4',
            children: children
          };
        },
        'list': function (children, args) {
          return {
            type: 'ul',
            props: {
              'class': 'dashboard__list'
            },
            children: children
          };
        },
        'list-item': function (children, args) {
          return {
            type: 'li',
            props: {
              'class': 'dashboard__list-item'
            },
            children: [
              {
                type: 'p',
                props: {
                  'class': 'dashboard__list-item-point',
                  'style': 'background-color: ' + color
                }
              },
              children
            ]
          };
        },
        'grid': function (children, args) {
          return {
            type: 'div',
            props: {
              'class': 'adp-dashboard__grid'
            },
            children: children
          };
        },
        'column': function (children, args) {
          var style = [];
          
          if (typeof args.backgroundColor === 'string') {
            style.push('background-color: ' + args.backgroundColor + '');
          }
          
          return {
            type: 'div',
            props: {
              'class': 'adp-dashboard__item-33',
              'style': style.join('; ')
            },
            children: children
          };
        },
        'circle': function (children, args) {
          return {
            type: 'div',
            props: {
              'layout': 'row',
              'layout-align': 'center center',
              'class': 'dashboard__circle',
              'style': 'background-color: ' + color
            },
            children: children
          };
        },
        'fraction': function (children, args, params) {
          var fraction = children.split('/');
          
          return {
            type: 'span',
            props: {
              class: 'dashboard__fraction'
            },
            children: [
              {
                type: 'span',
                props: {
                  class: 'dashboard__fraction-numerator'
                },
                children: fraction[0]
              },
              {
                type: 'span',
                props: {
                  class: 'dashboard__fraction-denominator',
                  style: 'border-top-color: ' + color
                },
                children: fraction[1]
              }
            ]
          };
        },
        'image': function (children, args) {
          return {
            type: 'img',
            props: {
              class: 'dashboard__image',
              src: getImageUrl(args.source),
              alt: ''
            }
          };
        },
        'offset': function (children, args) {
          return {
            type: 'div',
            props: {
              class: 'dashboard__offset'
            }
          };
        },
        'tile': function (children) {
          return {
            type: 'div',
            props: {
              'class': 'adp-dashboard__item'
            },
            children: {
              type: 'div',
              props: {
                'class': 'adp-dashboard__tile panel panel-default'
              },
              children: children
            }
          };
        },
        'tile-x2': function (children) {
          return {
            type: 'div',
            props: {
              'class': 'adp-dashboard__item adp-dashboard__item-x2'
            },
            children: {
              type: 'div',
              props: {
                'class': 'adp-dashboard__tile panel panel-default'
              },
              children: children
            }
          };
        },
        'tile-x3': function (children) {
          return {
            type: 'div',
            props: {
              'class': 'adp-dashboard__item adp-dashboard__item-x3'
            },
            children: {
              type: 'div',
              props: {
                'class': 'adp-dashboard__tile panel panel-default'
              },
              children: children
            }
          };
        },
        'tile-x4': function (children) {
          return {
            type: 'div',
            props: {
              'class': 'adp-dashboard__item adp-dashboard__item-x4'
            },
            children: {
              type: 'div',
              props: {
                'class': 'adp-dashboard__tile panel panel-default'
              },
              children: children
            }
          };
        },
        'tile-header': function (children) {
          return {
            type: 'div',
            props: {
              'class': 'panel-heading'
            },
            children: {
              type: 'h3',
              props: {
                class: 'panel-title'
              },
              children: children
            }
          };
        },
        'chart-body': function (children) {
          return {
            type: 'adp-chart',
            props: {
              'item': 'item',
              'data': 'data'
            },
            children: children
          };
        },
        'tile-body': function (children) {
          return {
            type: 'div',
            props: {
              'class': 'panel-body'
            },
            children: {
              type: 'adp-dashboard-content',
              props: {
                'item': 'item',
                'data': 'data'
              },
              children: children
            }
          };
        },
        'tile-footer': function (children) {
          return {
            type: 'div',
            props: {
              'class': 'panel-footer text-capitalize'
            },
            children: {
              type: 'a',
              props: {
                'class': 'btn btn-default',
                'ng-click': 'action(item.parameters.action, item)'
              },
              children: children
            }
          };
        }
      };
      
      function generateTemplate(template, data) {
        if (typeof data === 'undefined') {
          data = {};
        }
        
        var cursor = 0;
        var code = 'with(obj) { var r=[];\n';
        var result = void 0;
        var match = void 0;


        function addLine(line, js) {
          if (js) {
            code += line.match(reExp) ? line + '\n' : 'r.push(' + line + ');\n';
          } else {
            code += line != '' ? 'r.push("' + line.replace(/"/g, '\\"') + '");\n' : '';
          }
  
          return addLine;
        }

        while (match = re.exec(template)) {
          addLine(template.slice(cursor, match.index))(match[1], true);
  
          cursor = match.index + match[0].length;
        }

        addLine(template.substr(cursor, template.length - cursor));
        code = (code + 'return r.join(""); }').replace(/[\r\t\n]/g, ' ');

        if (_.isEmpty(data)) {
          code = 'with(obj) {var r=[]; r.push("<no-data>No Data<no-data/>"); return r.join("");}'
        }

        try {
          result = new Function('obj', code).apply(data, [data]);
        } catch (err) {
          console.error("'" + err.message + "'", " in \n\nCode:\n", code, "\n");
        }

        return result;
      }
      
      function parseElement(offset) {
        var result = {
          type: null,
          args: {},
          isEnd: false,
          withEnd: false
        };
        
        if (offset.slice(-1) === '/') {
          result.withEnd = true;
          
          offset = offset.slice(0, -1);
        }
        
        offset.split(' ').forEach(function (str, index) {
          if (index === 0) {
            if (str.charAt(0) === '/') {
              result.isEnd = true;
            }
            
            result.type = str.replace(/^\//g, '');
          } else {
            var splitArg = str.split('=');
            
            if (splitArg[0].trim().length) {
              result.args[splitArg[0]] = splitArg[1] ? splitArg[1].replace(/(^"|"$)/g, '') : '';
            }
          }
        });
        
        return result;
      }
      
      function parseTemplate(template) {
        var cursor = 0;
        var tree = [];
        var currentLink = tree;
        var paths = [currentLink];
        var match = void 0;
        
        while (match = reElement.exec(template)) {
          if (template.slice(cursor, match.index).trim().length) {
            currentLink.push({
              type: 'string',
              args: {},
              children: template.slice(cursor, match.index)
            });
          }
          
          var element = parseElement(match[2]);
          
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
      }
      
      function jsonToDOM(json, doc, nodes) {
        if (typeof doc === 'undefined') {
          doc = document;
        }
        
        if (typeof nodes === 'undefined') {
          nodes = {};
        }
        
        var namespaces = {
          html: 'http://www.w3.org/1999/xhtml',
          xul: 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul'
        };
        var defaultNamespace = namespaces.html;
        
        function namespace(name) {
          var m = /^(?:(.*):)?(.*)$/.exec(name);
          return [namespaces[m[1]], m[2]];
        }
        
        function tag(name, attr) {
          if (_.isArray(name)) {
            var frag = doc.createDocumentFragment();
            
            Array.prototype.forEach.call(arguments, function (arg) {
              if (!_.isArray(arg[0])) {
                frag.appendChild(tag.apply(null, arg));
              } else {
                arg.forEach(function (arg) {
                  frag.appendChild(tag.apply(null, arg));
                });
              }
            });
            
            return frag;
          }
          
          var args = Array.prototype.slice.call(arguments, 2);
          var vals = namespace(name);
          var elem = doc.createElementNS(vals[0] || defaultNamespace, vals[1]);

          for (var key in attr) {
            if (attr.hasOwnProperty(key)) {
              var val = attr[key];
              
              if (nodes && key === 'key') {
                nodes[val] = elem;
              }
              
              vals = namespace(key);
              
              if (typeof val === 'function') {
                elem.addEventListener(key.replace(/^on/, ''), val, false);
              } else {
                elem.setAttributeNS(vals[0] || '', vals[1], val);
              }
            }
          }
          args.forEach(function (e) {
            try {
              elem.appendChild(
                Object.prototype.toString.call(e) === '[object Array]' ? tag.apply(null, e) :
                  e instanceof doc.defaultView.Node ? e : doc.createTextNode(e)
              );
            } catch (ex) {
              elem.appendChild(doc.createTextNode(ex));
            }
          });
          
          return elem;
        }
        
        return tag.apply(null, json);
      }
      
      function generateDomObject(schema, parent) {
        if (typeof parent === 'undefined') {
          parent = null;
        }
        
        if (!schema || !schema.length) {
          return null;
        }
        
        if (typeof schema === 'string') {
          return schema;
        }
        
        var result = [];
        
        for (var i = 0; i < schema.length; i++) {
          var _item = schema[i];
          
          var currentComponent = components[_item.type];
          
          if (!currentComponent) {
            continue;
          }
          
          var childrenTemplate = generateDomObject(_item.children, _item);
          var renderedComponent = currentComponent(childrenTemplate, _item.args, {
            parent: parent
          });
          
          if (!renderedComponent) {
            continue;
          }
          
          result.push(renderedComponent);
        }
        
        return result.length ? (result.length === 1 ? result[0] : result) : null;
      }
      
      function generateJsonDom(DomObject) {
        if (!DomObject || (_.isArray(DomObject) && !DomObject.length)) {
          return [];
        }
        
        if (typeof DomObject === 'string') {
          if (DomObject == 'NaN') {
            return '';
          }
          
          return DomObject;
        }
        
        if (!_.isArray(DomObject)) {
          return (
            [DomObject.type, DomObject.props]
              .concat(
                generateJsonDom(
                  _.isArray(DomObject.children)
                    ? DomObject.children
                    : [DomObject.children]
                )
              )
          );
        }
        
        var result = [];
        
        DomObject.forEach(function (item) {
          var jsonDom = generateJsonDom(item);
          
          if (jsonDom && (!_.isArray(jsonDom) || jsonDom.length)) {
            result.push(jsonDom);
          }
        });
        
        return result;
      }
      
      return jsonToDOM(
        ['div', {
          class: 'dashboard',
          style: 'color: ' + color
        }, generateJsonDom(
          generateDomObject(
            parseTemplate(
              generateTemplate(template, data)
            )
          )
        )]
      );
    }
    
    
    return {
      parseTemplate: TemplateGenerator
    }
  }
})();

