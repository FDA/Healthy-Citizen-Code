// Module contains Highcharts.getOptions() object
// Needed to get colours and other params
// Highcharts is a library for browser. It requires window.navigator object, which is not defined in this app.
// Another workaround is using some kind of DOM implementation
// Topic here: https://stackoverflow.com/questions/44705749/highchart-basic-chart-using-nodejs

// Used for getting Color for Highcharts
class Color {
  constructor(hexCode) {
    this.input = hexCode;
    this.rgba = [];
    //cut '#' and get hex values
    const hexValues = hexCode.substr(1).split('');
    if (hexValues.length !== 6) {
      this.rgba = [255, 255, 255];
    } else {
      // R
      this.rgba.push(parseInt(hexValues[0], 16) * 16 + parseInt(hexValues[1], 16));
      // G
      this.rgba.push(parseInt(hexValues[2], 16) * 16 + parseInt(hexValues[3], 16));
      // B
      this.rgba.push(parseInt(hexValues[4], 16) * 16 + parseInt(hexValues[5], 16));
      // Opacity default value
      this.rgba.push(1);
    }
  }

  setOpacity(opacity) {
    this.rgba[3] = opacity;
    return this;
  }

  get() {
    return `rgba(${this.rgba.join(',')})`;
  }
};


const Highcharts = {
  getOptions: () => {
    return {
      "colors": [
        "#7cb5ec",
        "#434348",
        "#90ed7d",
        "#f7a35c",
        "#8085e9",
        "#f15c80",
        "#e4d354",
        "#2b908f",
        "#f45b5b",
        "#91e8e1"
      ],
      "symbols": [
        "circle",
        "diamond",
        "square",
        "triangle",
        "triangle-down"
      ],
      "lang": {
        "loading": "Loading...",
        "months": [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December"
        ],
        "shortMonths": [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec"
        ],
        "weekdays": [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday"
        ],
        "decimalPoint": ".",
        "numericSymbols": [
          "k",
          "M",
          "G",
          "T",
          "P",
          "E"
        ],
        "resetZoom": "Reset zoom",
        "resetZoomTitle": "Reset zoom level 1:1",
        "thousandsSep": " "
      },
      "global": {
        "useUTC": true
      },
      "chart": {
        "borderRadius": 0,
        "defaultSeriesType": "line",
        "ignoreHiddenSeries": true,
        "spacing": [
          10,
          10,
          15,
          10
        ],
        "resetZoomButton": {
          "theme": {
            "zIndex": 20
          },
          "position": {
            "align": "right",
            "x": -10,
            "y": 10
          }
        },
        "width": null,
        "height": null,
        "borderColor": "#335cad",
        "backgroundColor": "#ffffff",
        "plotBorderColor": "#cccccc"
      },
      "title": {
        "text": "Chart title",
        "align": "center",
        "margin": 15,
        "widthAdjust": -44
      },
      "subtitle": {
        "text": "",
        "align": "center",
        "widthAdjust": -44
      },
      "plotOptions": {
        "line": {
          "lineWidth": 2,
          "allowPointSelect": false,
          "showCheckbox": false,
          "animation": {
            "duration": 1000
          },
          "events": {},
          "marker": {
            "lineWidth": 0,
            "lineColor": "#ffffff",
            "radius": 4,
            "states": {
              "hover": {
                "animation": {
                  "duration": 50
                },
                "enabled": true,
                "radiusPlus": 2,
                "lineWidthPlus": 1
              },
              "select": {
                "fillColor": "#cccccc",
                "lineColor": "#000000",
                "lineWidth": 2
              }
            }
          },
          "point": {
            "events": {}
          },
          "dataLabels": {
            "align": "center",
            "style": {
              "fontSize": "11px",
              "fontWeight": "bold",
              "color": "contrast",
              "textOutline": "1px contrast"
            },
            "verticalAlign": "bottom",
            "x": 0,
            "y": 0,
            "padding": 5
          },
          "cropThreshold": 300,
          "pointRange": 0,
          "softThreshold": true,
          "states": {
            "hover": {
              "animation": {
                "duration": 50
              },
              "lineWidthPlus": 1,
              "marker": {},
              "halo": {
                "size": 10,
                "opacity": 0.25
              }
            },
            "select": {
              "marker": {}
            }
          },
          "stickyTracking": true,
          "turboThreshold": 1000,
          "findNearestPointBy": "x"
        },
        "area": {
          "lineWidth": 2,
          "allowPointSelect": false,
          "showCheckbox": false,
          "animation": {
            "duration": 1000
          },
          "events": {},
          "marker": {
            "lineWidth": 0,
            "lineColor": "#ffffff",
            "radius": 4,
            "states": {
              "hover": {
                "animation": {
                  "duration": 50
                },
                "enabled": true,
                "radiusPlus": 2,
                "lineWidthPlus": 1
              },
              "select": {
                "fillColor": "#cccccc",
                "lineColor": "#000000",
                "lineWidth": 2
              }
            }
          },
          "point": {
            "events": {}
          },
          "dataLabels": {
            "align": "center",
            "style": {
              "fontSize": "11px",
              "fontWeight": "bold",
              "color": "contrast",
              "textOutline": "1px contrast"
            },
            "verticalAlign": "bottom",
            "x": 0,
            "y": 0,
            "padding": 5
          },
          "cropThreshold": 300,
          "pointRange": 0,
          "softThreshold": false,
          "states": {
            "hover": {
              "animation": {
                "duration": 50
              },
              "lineWidthPlus": 1,
              "marker": {},
              "halo": {
                "size": 10,
                "opacity": 0.25
              }
            },
            "select": {
              "marker": {}
            }
          },
          "stickyTracking": true,
          "turboThreshold": 1000,
          "findNearestPointBy": "x",
          "threshold": 0
        },
        "spline": {
          "lineWidth": 2,
          "allowPointSelect": false,
          "showCheckbox": false,
          "animation": {
            "duration": 1000
          },
          "events": {},
          "marker": {
            "lineWidth": 0,
            "lineColor": "#ffffff",
            "radius": 4,
            "states": {
              "hover": {
                "animation": {
                  "duration": 50
                },
                "enabled": true,
                "radiusPlus": 2,
                "lineWidthPlus": 1
              },
              "select": {
                "fillColor": "#cccccc",
                "lineColor": "#000000",
                "lineWidth": 2
              }
            }
          },
          "point": {
            "events": {}
          },
          "dataLabels": {
            "align": "center",
            "style": {
              "fontSize": "11px",
              "fontWeight": "bold",
              "color": "contrast",
              "textOutline": "1px contrast"
            },
            "verticalAlign": "bottom",
            "x": 0,
            "y": 0,
            "padding": 5
          },
          "cropThreshold": 300,
          "pointRange": 0,
          "softThreshold": true,
          "states": {
            "hover": {
              "animation": {
                "duration": 50
              },
              "lineWidthPlus": 1,
              "marker": {},
              "halo": {
                "size": 10,
                "opacity": 0.25
              }
            },
            "select": {
              "marker": {}
            }
          },
          "stickyTracking": true,
          "turboThreshold": 1000,
          "findNearestPointBy": "x"
        },
        "areaspline": {
          "lineWidth": 2,
          "allowPointSelect": false,
          "showCheckbox": false,
          "animation": {
            "duration": 1000
          },
          "events": {},
          "marker": {
            "lineWidth": 0,
            "lineColor": "#ffffff",
            "radius": 4,
            "states": {
              "hover": {
                "animation": {
                  "duration": 50
                },
                "enabled": true,
                "radiusPlus": 2,
                "lineWidthPlus": 1
              },
              "select": {
                "fillColor": "#cccccc",
                "lineColor": "#000000",
                "lineWidth": 2
              }
            }
          },
          "point": {
            "events": {}
          },
          "dataLabels": {
            "align": "center",
            "style": {
              "fontSize": "11px",
              "fontWeight": "bold",
              "color": "contrast",
              "textOutline": "1px contrast"
            },
            "verticalAlign": "bottom",
            "x": 0,
            "y": 0,
            "padding": 5
          },
          "cropThreshold": 300,
          "pointRange": 0,
          "softThreshold": false,
          "states": {
            "hover": {
              "animation": {
                "duration": 50
              },
              "lineWidthPlus": 1,
              "marker": {},
              "halo": {
                "size": 10,
                "opacity": 0.25
              }
            },
            "select": {
              "marker": {}
            }
          },
          "stickyTracking": true,
          "turboThreshold": 1000,
          "findNearestPointBy": "x",
          "threshold": 0
        },
        "column": {
          "lineWidth": 2,
          "allowPointSelect": false,
          "showCheckbox": false,
          "animation": {
            "duration": 1000
          },
          "events": {},
          "marker": null,
          "point": {
            "events": {}
          },
          "dataLabels": {
            "align": null,
            "style": {
              "fontSize": "11px",
              "fontWeight": "bold",
              "color": "contrast",
              "textOutline": "1px contrast"
            },
            "verticalAlign": null,
            "x": 0,
            "y": null,
            "padding": 5
          },
          "cropThreshold": 50,
          "pointRange": null,
          "softThreshold": false,
          "states": {
            "hover": {
              "animation": {
                "duration": 50
              },
              "lineWidthPlus": 1,
              "marker": {},
              "halo": false,
              "brightness": 0.1,
              "shadow": false
            },
            "select": {
              "marker": {},
              "color": "#cccccc",
              "borderColor": "#000000",
              "shadow": false
            }
          },
          "stickyTracking": false,
          "turboThreshold": 1000,
          "findNearestPointBy": "x",
          "borderRadius": 0,
          "crisp": true,
          "groupPadding": 0.2,
          "pointPadding": 0.1,
          "minPointLength": 0,
          "startFromThreshold": true,
          "tooltip": {
            "distance": 6
          },
          "threshold": 0,
          "borderColor": "#ffffff"
        },
        "bar": {
          "lineWidth": 2,
          "allowPointSelect": false,
          "showCheckbox": false,
          "animation": {
            "duration": 1000
          },
          "events": {},
          "marker": null,
          "point": {
            "events": {}
          },
          "dataLabels": {
            "align": null,
            "style": {
              "fontSize": "11px",
              "fontWeight": "bold",
              "color": "contrast",
              "textOutline": "1px contrast"
            },
            "verticalAlign": null,
            "x": 0,
            "y": null,
            "padding": 5
          },
          "cropThreshold": 50,
          "pointRange": null,
          "softThreshold": false,
          "states": {
            "hover": {
              "animation": {
                "duration": 50
              },
              "lineWidthPlus": 1,
              "marker": {},
              "halo": false,
              "brightness": 0.1,
              "shadow": false
            },
            "select": {
              "marker": {},
              "color": "#cccccc",
              "borderColor": "#000000",
              "shadow": false
            }
          },
          "stickyTracking": false,
          "turboThreshold": 1000,
          "findNearestPointBy": "x",
          "borderRadius": 0,
          "crisp": true,
          "groupPadding": 0.2,
          "pointPadding": 0.1,
          "minPointLength": 0,
          "startFromThreshold": true,
          "tooltip": {
            "distance": 6
          },
          "threshold": 0,
          "borderColor": "#ffffff"
        },
        "scatter": {
          "lineWidth": 0,
          "allowPointSelect": false,
          "showCheckbox": false,
          "animation": {
            "duration": 1000
          },
          "events": {},
          "marker": {
            "lineWidth": 0,
            "lineColor": "#ffffff",
            "radius": 4,
            "states": {
              "hover": {
                "animation": {
                  "duration": 50
                },
                "enabled": true,
                "radiusPlus": 2,
                "lineWidthPlus": 1
              },
              "select": {
                "fillColor": "#cccccc",
                "lineColor": "#000000",
                "lineWidth": 2
              }
            },
            "enabled": true
          },
          "point": {
            "events": {}
          },
          "dataLabels": {
            "align": "center",
            "style": {
              "fontSize": "11px",
              "fontWeight": "bold",
              "color": "contrast",
              "textOutline": "1px contrast"
            },
            "verticalAlign": "bottom",
            "x": 0,
            "y": 0,
            "padding": 5
          },
          "cropThreshold": 300,
          "pointRange": 0,
          "softThreshold": true,
          "states": {
            "hover": {
              "animation": {
                "duration": 50
              },
              "lineWidthPlus": 1,
              "marker": {},
              "halo": {
                "size": 10,
                "opacity": 0.25
              }
            },
            "select": {
              "marker": {}
            }
          },
          "stickyTracking": true,
          "turboThreshold": 1000,
          "findNearestPointBy": "xy",
          "tooltip": {
            "headerFormat": "<span style=\"color:{point.color}\">●</span> <span style=\"font-size: 0.85em\"> {series.name}</span><br/>",
            "pointFormat": "x: <b>{point.x}</b><br/>y: <b>{point.y}</b><br/>"
          }
        },
        "pie": {
          "lineWidth": 2,
          "allowPointSelect": false,
          "showCheckbox": false,
          "animation": {
            "duration": 1000
          },
          "events": {},
          "marker": null,
          "point": {
            "events": {}
          },
          "dataLabels": {
            "align": "center",
            "style": {
              "fontSize": "11px",
              "fontWeight": "bold",
              "color": "contrast",
              "textOutline": "1px contrast"
            },
            "verticalAlign": "bottom",
            "x": 0,
            "y": 0,
            "padding": 5,
            "distance": 30,
            "enabled": true
          },
          "cropThreshold": 300,
          "pointRange": 0,
          "softThreshold": true,
          "states": {
            "hover": {
              "animation": {
                "duration": 50
              },
              "lineWidthPlus": 1,
              "marker": {},
              "halo": {
                "size": 10,
                "opacity": 0.25
              },
              "brightness": 0.1,
              "shadow": false
            },
            "select": {
              "marker": {}
            }
          },
          "stickyTracking": false,
          "turboThreshold": 1000,
          "findNearestPointBy": "x",
          "center": [
            null,
            null
          ],
          "clip": false,
          "colorByPoint": true,
          "ignoreHiddenPoint": true,
          "legendType": "point",
          "size": null,
          "showInLegend": false,
          "slicedOffset": 10,
          "tooltip": {
            "followPointer": true
          },
          "borderColor": "#ffffff",
          "borderWidth": 1
        },
        "arearange": {
          "lineWidth": 1,
          "allowPointSelect": false,
          "showCheckbox": false,
          "animation": {
            "duration": 1000
          },
          "events": {},
          "marker": {
            "lineWidth": 0,
            "lineColor": "#ffffff",
            "radius": 4,
            "states": {
              "hover": {
                "animation": {
                  "duration": 50
                },
                "enabled": true,
                "radiusPlus": 2,
                "lineWidthPlus": 1
              },
              "select": {
                "fillColor": "#cccccc",
                "lineColor": "#000000",
                "lineWidth": 2
              }
            }
          },
          "point": {
            "events": {}
          },
          "dataLabels": {
            "align": null,
            "style": {
              "fontSize": "11px",
              "fontWeight": "bold",
              "color": "contrast",
              "textOutline": "1px contrast"
            },
            "verticalAlign": null,
            "x": 0,
            "y": 0,
            "padding": 5,
            "xLow": 0,
            "xHigh": 0,
            "yLow": 0,
            "yHigh": 0
          },
          "cropThreshold": 300,
          "pointRange": 0,
          "softThreshold": false,
          "states": {
            "hover": {
              "animation": {
                "duration": 50
              },
              "lineWidthPlus": 1,
              "marker": {},
              "halo": {
                "size": 10,
                "opacity": 0.25
              }
            },
            "select": {
              "marker": {}
            }
          },
          "stickyTracking": true,
          "turboThreshold": 1000,
          "findNearestPointBy": "x",
          "threshold": null,
          "tooltip": {
            "pointFormat": "<span style=\"color:{series.color}\">●</span> {series.name}: <b>{point.low}</b> - <b>{point.high}</b><br/>"
          },
          "trackByArea": true
        },
        "areasplinerange": {
          "lineWidth": 1,
          "allowPointSelect": false,
          "showCheckbox": false,
          "animation": {
            "duration": 1000
          },
          "events": {},
          "marker": {
            "lineWidth": 0,
            "lineColor": "#ffffff",
            "radius": 4,
            "states": {
              "hover": {
                "animation": {
                  "duration": 50
                },
                "enabled": true,
                "radiusPlus": 2,
                "lineWidthPlus": 1
              },
              "select": {
                "fillColor": "#cccccc",
                "lineColor": "#000000",
                "lineWidth": 2
              }
            }
          },
          "point": {
            "events": {}
          },
          "dataLabels": {
            "align": null,
            "style": {
              "fontSize": "11px",
              "fontWeight": "bold",
              "color": "contrast",
              "textOutline": "1px contrast"
            },
            "verticalAlign": null,
            "x": 0,
            "y": 0,
            "padding": 5,
            "xLow": 0,
            "xHigh": 0,
            "yLow": 0,
            "yHigh": 0
          },
          "cropThreshold": 300,
          "pointRange": 0,
          "softThreshold": false,
          "states": {
            "hover": {
              "animation": {
                "duration": 50
              },
              "lineWidthPlus": 1,
              "marker": {},
              "halo": {
                "size": 10,
                "opacity": 0.25
              }
            },
            "select": {
              "marker": {}
            }
          },
          "stickyTracking": true,
          "turboThreshold": 1000,
          "findNearestPointBy": "x",
          "threshold": null,
          "tooltip": {
            "pointFormat": "<span style=\"color:{series.color}\">●</span> {series.name}: <b>{point.low}</b> - <b>{point.high}</b><br/>"
          },
          "trackByArea": true
        },
        "columnrange": {
          "lineWidth": 1,
          "allowPointSelect": false,
          "showCheckbox": false,
          "animation": {
            "duration": 1000
          },
          "events": {},
          "marker": null,
          "point": {
            "events": {}
          },
          "dataLabels": {
            "align": null,
            "style": {
              "fontSize": "11px",
              "fontWeight": "bold",
              "color": "contrast",
              "textOutline": "1px contrast"
            },
            "verticalAlign": null,
            "x": 0,
            "y": 0,
            "padding": 5,
            "xLow": 0,
            "xHigh": 0,
            "yLow": 0,
            "yHigh": 0
          },
          "cropThreshold": 300,
          "pointRange": null,
          "softThreshold": false,
          "states": {
            "hover": {
              "animation": {
                "duration": 50
              },
              "lineWidthPlus": 1,
              "marker": {},
              "halo": false,
              "brightness": 0.1,
              "shadow": false
            },
            "select": {
              "marker": {},
              "color": "#cccccc",
              "borderColor": "#000000",
              "shadow": false
            }
          },
          "stickyTracking": true,
          "turboThreshold": 1000,
          "findNearestPointBy": "x",
          "threshold": null,
          "tooltip": {
            "pointFormat": "<span style=\"color:{series.color}\">●</span> {series.name}: <b>{point.low}</b> - <b>{point.high}</b><br/>",
            "distance": 6
          },
          "trackByArea": true,
          "borderRadius": 0,
          "crisp": true,
          "groupPadding": 0.2,
          "pointPadding": 0.1,
          "minPointLength": 0,
          "startFromThreshold": true,
          "borderColor": "#ffffff"
        },
        "gauge": {
          "lineWidth": 2,
          "allowPointSelect": false,
          "showCheckbox": false,
          "animation": {
            "duration": 1000
          },
          "events": {},
          "marker": {
            "lineWidth": 0,
            "lineColor": "#ffffff",
            "radius": 4,
            "states": {
              "hover": {
                "animation": {
                  "duration": 50
                },
                "enabled": true,
                "radiusPlus": 2,
                "lineWidthPlus": 1
              },
              "select": {
                "fillColor": "#cccccc",
                "lineColor": "#000000",
                "lineWidth": 2
              }
            }
          },
          "point": {
            "events": {}
          },
          "dataLabels": {
            "align": "center",
            "style": {
              "fontSize": "11px",
              "fontWeight": "bold",
              "color": "contrast",
              "textOutline": "1px contrast"
            },
            "verticalAlign": "top",
            "x": 0,
            "y": 15,
            "padding": 5,
            "enabled": true,
            "defer": false,
            "borderRadius": 3,
            "crop": false,
            "zIndex": 2,
            "borderWidth": 1,
            "borderColor": "#cccccc"
          },
          "cropThreshold": 300,
          "pointRange": 0,
          "softThreshold": true,
          "states": {
            "hover": {
              "animation": {
                "duration": 50
              },
              "lineWidthPlus": 1,
              "marker": {},
              "halo": {
                "size": 10,
                "opacity": 0.25
              }
            },
            "select": {
              "marker": {}
            }
          },
          "stickyTracking": true,
          "turboThreshold": 1000,
          "findNearestPointBy": "x",
          "dial": {},
          "pivot": {},
          "tooltip": {
            "headerFormat": ""
          },
          "showInLegend": false
        },
        "boxplot": {
          "lineWidth": 1,
          "allowPointSelect": false,
          "showCheckbox": false,
          "animation": {
            "duration": 1000
          },
          "events": {},
          "marker": null,
          "point": {
            "events": {}
          },
          "dataLabels": {
            "align": null,
            "style": {
              "fontSize": "11px",
              "fontWeight": "bold",
              "color": "contrast",
              "textOutline": "1px contrast"
            },
            "verticalAlign": null,
            "x": 0,
            "y": null,
            "padding": 5
          },
          "cropThreshold": 50,
          "pointRange": null,
          "softThreshold": false,
          "states": {
            "hover": {
              "animation": {
                "duration": 50
              },
              "lineWidthPlus": 1,
              "marker": {},
              "halo": false,
              "brightness": -0.3,
              "shadow": false
            },
            "select": {
              "marker": {},
              "color": "#cccccc",
              "borderColor": "#000000",
              "shadow": false
            }
          },
          "stickyTracking": false,
          "turboThreshold": 1000,
          "findNearestPointBy": "x",
          "borderRadius": 0,
          "crisp": true,
          "groupPadding": 0.2,
          "pointPadding": 0.1,
          "minPointLength": 0,
          "startFromThreshold": true,
          "tooltip": {
            "distance": 6,
            "pointFormat": "<span style=\"color:{point.color}\">●</span> <b> {series.name}</b><br/>Maximum: {point.high}<br/>Upper quartile: {point.q3}<br/>Median: {point.median}<br/>Lower quartile: {point.q1}<br/>Minimum: {point.low}<br/>"
          },
          "threshold": null,
          "borderColor": "#ffffff",
          "whiskerLength": "50%",
          "fillColor": "#ffffff",
          "medianWidth": 2,
          "whiskerWidth": 2
        },
        "errorbar": {
          "lineWidth": 1,
          "allowPointSelect": false,
          "showCheckbox": false,
          "animation": {
            "duration": 1000
          },
          "events": {},
          "marker": null,
          "point": {
            "events": {}
          },
          "dataLabels": {
            "align": null,
            "style": {
              "fontSize": "11px",
              "fontWeight": "bold",
              "color": "contrast",
              "textOutline": "1px contrast"
            },
            "verticalAlign": null,
            "x": 0,
            "y": null,
            "padding": 5
          },
          "cropThreshold": 50,
          "pointRange": null,
          "softThreshold": false,
          "states": {
            "hover": {
              "animation": {
                "duration": 50
              },
              "lineWidthPlus": 1,
              "marker": {},
              "halo": false,
              "brightness": -0.3,
              "shadow": false
            },
            "select": {
              "marker": {},
              "color": "#cccccc",
              "borderColor": "#000000",
              "shadow": false
            }
          },
          "stickyTracking": false,
          "turboThreshold": 1000,
          "findNearestPointBy": "x",
          "borderRadius": 0,
          "crisp": true,
          "groupPadding": 0.2,
          "pointPadding": 0.1,
          "minPointLength": 0,
          "startFromThreshold": true,
          "tooltip": {
            "distance": 6,
            "pointFormat": "<span style=\"color:{point.color}\">●</span> {series.name}: <b>{point.low}</b> - <b>{point.high}</b><br/>"
          },
          "threshold": null,
          "borderColor": "#ffffff",
          "whiskerLength": "50%",
          "fillColor": "#ffffff",
          "medianWidth": 2,
          "whiskerWidth": null,
          "color": "#000000",
          "grouping": false,
          "linkedTo": ":previous"
        },
        "waterfall": {
          "lineWidth": 1,
          "allowPointSelect": false,
          "showCheckbox": false,
          "animation": {
            "duration": 1000
          },
          "events": {},
          "marker": null,
          "point": {
            "events": {}
          },
          "dataLabels": {
            "align": null,
            "style": {
              "fontSize": "11px",
              "fontWeight": "bold",
              "color": "contrast",
              "textOutline": "1px contrast"
            },
            "verticalAlign": null,
            "x": 0,
            "y": null,
            "padding": 5,
            "inside": true
          },
          "cropThreshold": 50,
          "pointRange": null,
          "softThreshold": false,
          "states": {
            "hover": {
              "animation": {
                "duration": 50
              },
              "lineWidthPlus": 0,
              "marker": {},
              "halo": false,
              "brightness": 0.1,
              "shadow": false
            },
            "select": {
              "marker": {},
              "color": "#cccccc",
              "borderColor": "#000000",
              "shadow": false
            }
          },
          "stickyTracking": false,
          "turboThreshold": 1000,
          "findNearestPointBy": "x",
          "borderRadius": 0,
          "crisp": true,
          "groupPadding": 0.2,
          "pointPadding": 0.1,
          "minPointLength": 0,
          "startFromThreshold": true,
          "tooltip": {
            "distance": 6
          },
          "threshold": 0,
          "borderColor": "#333333",
          "lineColor": "#333333",
          "dashStyle": "dot"
        },
        "polygon": {
          "lineWidth": 0,
          "allowPointSelect": false,
          "showCheckbox": false,
          "animation": {
            "duration": 1000
          },
          "events": {},
          "marker": {
            "lineWidth": 0,
            "lineColor": "#ffffff",
            "radius": 4,
            "states": {
              "hover": {
                "animation": {
                  "duration": 50
                },
                "enabled": false,
                "radiusPlus": 2,
                "lineWidthPlus": 1
              },
              "select": {
                "fillColor": "#cccccc",
                "lineColor": "#000000",
                "lineWidth": 2
              }
            },
            "enabled": false
          },
          "point": {
            "events": {}
          },
          "dataLabels": {
            "align": "center",
            "style": {
              "fontSize": "11px",
              "fontWeight": "bold",
              "color": "contrast",
              "textOutline": "1px contrast"
            },
            "verticalAlign": "bottom",
            "x": 0,
            "y": 0,
            "padding": 5
          },
          "cropThreshold": 300,
          "pointRange": 0,
          "softThreshold": true,
          "states": {
            "hover": {
              "animation": {
                "duration": 50
              },
              "lineWidthPlus": 1,
              "marker": {},
              "halo": {
                "size": 10,
                "opacity": 0.25
              }
            },
            "select": {
              "marker": {}
            }
          },
          "stickyTracking": false,
          "turboThreshold": 1000,
          "findNearestPointBy": "xy",
          "tooltip": {
            "headerFormat": "<span style=\"color:{point.color}\">●</span> <span style=\"font-size: 0.85em\"> {series.name}</span><br/>",
            "pointFormat": "",
            "followPointer": true
          },
          "trackByArea": true
        },
        "bubble": {
          "lineWidth": 0,
          "allowPointSelect": false,
          "showCheckbox": false,
          "animation": {
            "duration": 1000
          },
          "events": {},
          "marker": {
            "lineWidth": 1,
            "lineColor": null,
            "radius": null,
            "states": {
              "hover": {
                "animation": {
                  "duration": 50
                },
                "enabled": true,
                "radiusPlus": 0,
                "lineWidthPlus": 1
              },
              "select": {
                "fillColor": "#cccccc",
                "lineColor": "#000000",
                "lineWidth": 2
              }
            },
            "enabled": true,
            "symbol": "circle"
          },
          "point": {
            "events": {}
          },
          "dataLabels": {
            "align": "center",
            "style": {
              "fontSize": "11px",
              "fontWeight": "bold",
              "color": "contrast",
              "textOutline": "1px contrast"
            },
            "verticalAlign": "middle",
            "x": 0,
            "y": 0,
            "padding": 5,
            "inside": true
          },
          "cropThreshold": 300,
          "pointRange": 0,
          "softThreshold": false,
          "states": {
            "hover": {
              "animation": {
                "duration": 50
              },
              "lineWidthPlus": 1,
              "marker": {},
              "halo": {
                "size": 5,
                "opacity": 0.25
              }
            },
            "select": {
              "marker": {}
            }
          },
          "stickyTracking": true,
          "turboThreshold": 0,
          "findNearestPointBy": "xy",
          "tooltip": {
            "headerFormat": "<span style=\"color:{point.color}\">●</span> <span style=\"font-size: 0.85em\"> {series.name}</span><br/>",
            "pointFormat": "({point.x}, {point.y}), Size: {point.z}"
          },
          "minSize": 8,
          "maxSize": "20%",
          "zThreshold": 0,
          "zoneAxis": "z"
        },
        "solidgauge": {
          "lineWidth": 2,
          "allowPointSelect": false,
          "showCheckbox": false,
          "animation": {
            "duration": 1000
          },
          "events": {},
          "marker": {
            "lineWidth": 0,
            "lineColor": "#ffffff",
            "radius": 4,
            "states": {
              "hover": {
                "animation": {
                  "duration": 50
                },
                "enabled": true,
                "radiusPlus": 2,
                "lineWidthPlus": 1
              },
              "select": {
                "fillColor": "#cccccc",
                "lineColor": "#000000",
                "lineWidth": 2
              }
            }
          },
          "point": {
            "events": {}
          },
          "dataLabels": {
            "align": "center",
            "style": {
              "fontSize": "11px",
              "fontWeight": "bold",
              "color": "contrast",
              "textOutline": "1px contrast"
            },
            "verticalAlign": "top",
            "x": 0,
            "y": 15,
            "padding": 5,
            "enabled": true,
            "defer": false,
            "borderRadius": 3,
            "crop": false,
            "zIndex": 2,
            "borderWidth": 1,
            "borderColor": "#cccccc"
          },
          "cropThreshold": 300,
          "pointRange": 0,
          "softThreshold": true,
          "states": {
            "hover": {
              "animation": {
                "duration": 50
              },
              "lineWidthPlus": 1,
              "marker": {},
              "halo": {
                "size": 10,
                "opacity": 0.25
              }
            },
            "select": {
              "marker": {}
            }
          },
          "stickyTracking": true,
          "turboThreshold": 1000,
          "findNearestPointBy": "x",
          "dial": {},
          "pivot": {},
          "tooltip": {
            "headerFormat": ""
          },
          "showInLegend": false,
          "colorByPoint": true
        }
      },
      "labels": {
        "style": {
          "position": "absolute",
          "color": "#333333"
        }
      },
      "legend": {
        "enabled": true,
        "align": "center",
        "layout": "horizontal",
        "borderColor": "#999999",
        "borderRadius": 0,
        "navigation": {
          "activeColor": "#003399",
          "inactiveColor": "#cccccc"
        },
        "itemStyle": {
          "color": "#333333",
          "fontSize": "12px",
          "fontWeight": "bold",
          "textOverflow": "ellipsis",
          "cursor": "pointer"
        },
        "itemHoverStyle": {
          "color": "#000000"
        },
        "itemHiddenStyle": {
          "color": "#cccccc"
        },
        "shadow": false,
        "itemCheckboxStyle": {
          "position": "absolute",
          "width": "13px",
          "height": "13px"
        },
        "squareSymbol": true,
        "symbolPadding": 5,
        "verticalAlign": "bottom",
        "x": 0,
        "y": 0,
        "title": {
          "style": {
            "fontWeight": "bold"
          }
        }
      },
      "loading": {
        "labelStyle": {
          "fontWeight": "bold",
          "position": "relative",
          "top": "45%"
        },
        "style": {
          "position": "absolute",
          "backgroundColor": "#ffffff",
          "opacity": 0.5,
          "textAlign": "center"
        }
      },
      "tooltip": {
        "enabled": true,
        "animation": true,
        "borderRadius": 3,
        "dateTimeLabelFormats": {
          "millisecond": "%A, %b %e, %H:%M:%S.%L",
          "second": "%A, %b %e, %H:%M:%S",
          "minute": "%A, %b %e, %H:%M",
          "hour": "%A, %b %e, %H:%M",
          "day": "%A, %b %e, %Y",
          "week": "Week from %A, %b %e, %Y",
          "month": "%B %Y",
          "year": "%Y"
        },
        "footerFormat": "",
        "padding": 8,
        "snap": 10,
        "backgroundColor": "rgba(247,247,247,0.85)",
        "borderWidth": 1,
        "headerFormat": "<span style=\"font-size: 10px\">{point.key}</span><br/>",
        "pointFormat": "<span style=\"color:{point.color}\">●</span> {series.name}: <b>{point.y}</b><br/>",
        "shadow": true,
        "style": {
          "color": "#333333",
          "cursor": "default",
          "fontSize": "12px",
          "pointerEvents": "none",
          "whiteSpace": "nowrap"
        }
      },
      "credits": {
        "enabled": true,
        "href": "http://www.highcharts.com",
        "position": {
          "align": "right",
          "x": -10,
          "verticalAlign": "bottom",
          "y": -5
        },
        "style": {
          "cursor": "pointer",
          "color": "#999999",
          "fontSize": "9px"
        },
        "text": "Highcharts.com"
      }
    }
  },
  Color: (hexCode) => {
    return new Color(hexCode);
  }
};

// Outputs 'rgba(124,181,236,0.3)'
// console.log(Highcharts.Color(Highcharts.getOptions().colors[0]).setOpacity(0.3).get());

module.exports = Highcharts;