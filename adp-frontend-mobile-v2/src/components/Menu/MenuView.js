import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  ScrollView,
  TouchableHighlight
} from 'react-native';
import {NavigationActions} from 'react-navigation';
import {getOption} from '../../services/localStorage';
import styles from './MenuViewStyles';
import _ from 'lodash';

class MenuItems extends Component {
  constructor() {
    super();

    this.openItem = this.openItem.bind(this);
    this.checkIsSelectedItem = this.checkIsSelectedItem.bind(this);
  }

  shouldComponentUpdate(nextProps, nextState) {
    return this.props.currentPath !== nextProps.currentPath;
  }

  openItem(item) {
    const {currentPath, currentRoute, closeMenu, reset} = this.props;

    if (
      currentRoute !== item.route ||
      currentPath !== item.params.currentPath
    ) {
      closeMenu();

      setTimeout(() => {
        reset({
          index: 0,
          actions: [
            NavigationActions.navigate({
              routeName: item.route,
              params: item.params
            })
          ]
        });
      }, 400);
    }
  }

  checkIsSelectedItem(item) {
    const {currentRoute, currentPath} = this.props;

    return (
      (
        currentRoute === item.route ||
        (currentRoute === 'Edit' && item.route === 'List')
      ) &&
      (currentPath || null) === (item.params.currentPath || null)
    );
  }

  render() {
    const {items, level, currentRoute, currentPath, closeMenu, reset} = this.props;

    return (
      <View>
        {
          items.map((item, key) => (
            <View
              key={`${level}-${key}`}
            >
              {
                item.route !== 'List' || item.params.currentPath ?
                  <TouchableHighlight
                    onPress={() => this.openItem(item)}
                    underlayColor={null}
                    style={[styles.itemContainer, this.checkIsSelectedItem(item) ? styles.itemContainerSelected : null]}
                  >
                    <Text
                      style={[styles.item, styles[`item__level_${level}`]]}
                    >
                      {(level > 1 ? '- ' : '') + item.name}
                    </Text>
                  </TouchableHighlight> :
                  <View
                    style={styles.itemContainer}
                  >
                    <Text
                      style={[styles.item, styles[`item__level_${level}`]]}
                    >
                      {(level > 1 ? '- ' : '') + item.name}
                    </Text>
                  </View>
              }
              {
                item.submenu ?
                  <MenuItems
                    items={item.submenu}
                    level={level + 1}
                    currentRoute={currentRoute}
                    currentPath={currentPath}
                    closeMenu={closeMenu}
                    reset={reset}
                  />
                  : null
              }
            </View>
          ))
        }
      </View>
    );
  }
}

MenuItems.propTypes = {
  reset: PropTypes.func.isRequired,
  closeMenu: PropTypes.func.isRequired,
  items: PropTypes.array.isRequired,
  level: PropTypes.number.isRequired,
  currentRoute: PropTypes.string.isRequired,
  currentPath: PropTypes.string
};

class Menu extends Component {
  constructor() {
    super();

    this.getMenuItems = this.getMenuItems.bind(this);
  }

  getMenuItems() {
    const {interfaces} = this.props;

    const items = interfaces.slice(0);
    const settingsItems = [];

    //if (getOption('skipPinCode') && !getOption('pinCode') && getOption('token')) {
    settingsItems.push({
      name: 'Set PIN code',
      route: 'AuthPinCode',
      params: {
        action: 'setPinCode'
      }
    });
    //}

    settingsItems.push({
      name: 'Logout',
      route: 'Auth',
      params: {
        action: 'logout'
      }
    });

    items.push({
      name: 'Account',
      route: 'List',
      params: {},
      submenu: settingsItems
    });

    return items;
  }

  render() {
    const {currentRoute, currentPath, closeMenu, profile, reset, appInfo} = this.props;

    return (
      <ScrollView
        scrollsToTop={false}
        style={styles.menu}
      >
        <View
          style={styles.profileContainer}
        >
          <Text
            style={styles.name}
          >
            {
              profile && profile.firstName && profile.lastName ?
                `${profile.firstName} ${profile.lastName}` :
                _.get(appInfo, 'title', '')
            }
          </Text>
        </View>

        <View
          style={styles.itemsContainer}
        >
          {
            <MenuItems
              items={this.getMenuItems()}
              level={1}
              currentRoute={currentRoute}
              currentPath={currentPath}
              closeMenu={closeMenu}
              reset={reset}
            />
          }
        </View>
      </ScrollView>
    );
  }
}

Menu.propTypes = {
  reset: PropTypes.func.isRequired,
  closeMenu: PropTypes.func.isRequired,
  interfaces: PropTypes.array.isRequired,
  currentRoute: PropTypes.string.isRequired,
  currentPath: PropTypes.string,
  profile: PropTypes.object
};

export default Menu;
