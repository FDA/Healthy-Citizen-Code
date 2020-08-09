import React from 'react';
import {
  Button,
  Icon
} from 'native-base';
import {StackNavigator} from 'react-navigation';
import Auth from './Auth';
import AuthPinCode from './AuthPinCode';
import ResourceLoading from './ResourceLoading';
import Dashboard from './Dashboard';
import DashboardItems from './DashboardItems';
import List from './List';
import Edit from './Edit';
import {getOption} from '../services/localStorage';

let Routes = null;

const getRoutes = () => {
  if (Routes) {
    return Routes;
  }

  const pinCode = getOption('pinCode');

  const routes = {
    Auth: {
      screen: Auth
    },
    AuthPinCode: {
      screen: AuthPinCode
    },
    ResourceLoading: {
      screen: ResourceLoading
    },
    Dashboard: {
      screen: Dashboard
    },
    DashboardItems: {
      screen: DashboardItems
    },
    List: {
      screen: List
    },
    Edit: {
      screen: Edit
    }
  };

  Routes = StackNavigator(routes, {
    initialRouteName: pinCode ? 'AuthPinCode' : 'Auth',
    initialRouteParams: pinCode ? {
      action: 'checkPinCode'
    } : null,
    headerMode: 'screen',
    navigationOptions: {
      header: ({state, showMenuButton, toggleMenu}) => ({
        left: showMenuButton ? <Button onPress={() => toggleMenu()} iconLeft transparent><Icon name='menu' /></Button> : undefined,
      }),
      cardStack: {
        gesturesEnabled: false
      }
    }
  });

  return Routes;
};

export {
  getRoutes
};
