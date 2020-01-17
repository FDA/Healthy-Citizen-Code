import React from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  TouchableHighlight
} from 'react-native';
import styles from '../ListViewStyles';

const RecordView = ({openMenuCurrentItemModal, section}) => (
  <TouchableHighlight
    underlayColor='#eee'
    onPress={() => openMenuCurrentItemModal()}
  >
    <View
      style={styles.rowContent}
    >
      {
        section.fields.filter(value => value.type !== 'Group').map((value, key) => (
          <View
            key={key}
            style={styles.rowValue}
          >
            <Text
              style={styles.fieldName}
            >
              {value.name}
            </Text>
            <Text
              style={styles.fieldValue}
            >
              {value.value}
            </Text>
          </View>
        ))

      }
    </View>
  </TouchableHighlight>
);

RecordView.propTypes = {
  openMenuCurrentItemModal: PropTypes.func.isRequired,
  section: PropTypes.object.isRequired
};

export default RecordView;
