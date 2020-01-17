import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text
} from 'react-native';
import {
  Body,
  Right,
  Grid,
  Col,
  ListItem,
  Icon
} from 'native-base';
import Collapsible from 'react-native-collapsible';
import RecordView from '../RecordView';
import styles from '../ListViewStyles';

class ListItemView extends Component {
  constructor() {
    super();
    
    this.state = {
      isOpened: false
    };
    
    this.toggleSection = this.toggleSection.bind(this);
    this._renderListItemHeader = this._renderListItemHeader.bind(this);
    this._renderListItemContent = this._renderListItemContent.bind(this);
  }

  toggleSection() {
    const {isOpened} = this.state;

    this.setState({
      isOpened: !isOpened
    });
  }

  _renderListItemHeader() {
    const {isOpened} = this.state;
    const {section, selectedItemId, columnsInItemHeader} = this.props;

    const isSelected = section.id === selectedItemId;
    let listItemStyles = styles.rowHeader;

    if (isOpened) {
      listItemStyles = {
        ...listItemStyles,
        ...styles.rowHeaderOpened
      };
    }
    if (isSelected) {
      listItemStyles = {
        ...listItemStyles,
        ...styles.rowHeaderSelected
      };
    }

    const notGroupFields = section.fields.filter(currentColumn => currentColumn.type !== 'Group');
    return (
      <ListItem
        onPress={() => this.toggleSection()}
        style={listItemStyles}
      >
        <Body>
        <Grid>
          {
            notGroupFields
              .slice(0, columnsInItemHeader).map((currentColumn, key) => (
              <Col
                key={key}
                style={[styles.column, key + 1 >= columnsInItemHeader ? styles.columnLast : {flex: 0, width: currentColumn.width}]}
              >
                <View
                  style={styles.columnContent}
                >
                  <Text
                    style={styles.columnValue}
                  >
                    {currentColumn.value}
                  </Text>
                </View>
              </Col>
            ))
          }
        </Grid>
        </Body>
        <Right
          icon
        >
          <Icon
            name={isOpened ? 'ios-arrow-up' : 'ios-arrow-down'}
          />
        </Right>
      </ListItem>
    );
  }

  _renderListItemContent() {
    const {isOpened} = this.state;
    const {openMenuCurrentItemModal, section} = this.props;

    return (
      <Collapsible
        collapsed={!isOpened}
        collapsedHeight={0}
        duration={200}
      >
        <RecordView
          openMenuCurrentItemModal={openMenuCurrentItemModal}
          section={section}
        />
      </Collapsible>
    );
  }

  render() {
    return (
      <View>
        {
          this._renderListItemHeader()
        }
        {
          this._renderListItemContent()
        }
      </View>
    );
  }
}

ListItemView.propTypes = {
  openMenuCurrentItemModal: PropTypes.func.isRequired,
  section: PropTypes.object.isRequired,
  selectedItemId: PropTypes.string,
  columnsInItemHeader: PropTypes.number.isRequired
};

export default ListItemView;
