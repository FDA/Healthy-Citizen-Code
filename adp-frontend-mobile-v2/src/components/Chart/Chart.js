import React, {Component} from 'react';
import PropTypes from 'prop-types';
import ChartView from 'react-native-highcharts';

class Chart extends Component {
  constructor() {
    super();
  }

  render() {
    return (
      <ChartView style={this.props.style || {flex: 1}} config={this.props.config}/>
    );
  }
}

Chart.propTypes = {
  style: PropTypes.object,
  config: PropTypes.object.isRequired
};

export default Chart;
