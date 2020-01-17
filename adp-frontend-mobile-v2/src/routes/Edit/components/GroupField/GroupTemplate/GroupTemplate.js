import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
  TouchableOpacity,
  View,
  Text
} from 'react-native';
import _ from 'lodash';

const GroupTemplate = (locals) => {
  if (locals.hidden) {
    return null;
  }
  const triangleStyle = locals.isOpened ? {...styles.triangleItem, ...styles.rotatedTriangle} : styles.triangleItem;
  return (
    <TouchableOpacity style={styles.container} onPress={() => locals.toggleGroup(locals.fieldId)}>
      <View style={triangleStyle}/>
      <Text style={styles.groupLabel}>{locals.label}</Text>
    </TouchableOpacity>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#dcdcfa',
    flexDirection: 'row',
    // height: 30,
    paddingTop: 15,
    paddingBottom: 15,
    paddingLeft: 10,
    marginBottom: 5
  },
  triangleItem: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    marginTop: 5,
    borderTopWidth: 6,
    borderRightWidth: 0,
    borderBottomWidth: 6,
    borderLeftWidth: 12,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#414141'
  },
  groupLabel: {
    marginLeft: 10,
    // marginTop: -5,
    color: '#000000',
    fontSize: 18,
    // fontWeight: 'bold'
  },
  rotatedTriangle: {
    transform: [{ rotate: '90deg'}]
  }
};

export default GroupTemplate;
