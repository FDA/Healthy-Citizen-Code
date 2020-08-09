import {
  AsyncStorage
} from 'react-native';
import {setOption, clearOption} from './localStorage';
import logger from './logger';

export const getStorageItem = async (itemId) => {
  try {
    let value = await AsyncStorage.getItem(itemId);

    if (value == parseInt(value) && value.length === parseInt(value).toString().length) {
      value = parseInt(value);
    }

    setOption(itemId, value);

    return value;
  } catch (error) {
    logger.error(error);
  }
};

export const setStorageItem = async (itemId, value) => {
  try {
    await AsyncStorage.setItem(itemId, value.toString());

    setOption(itemId, value);
  } catch (error) {
    logger.error(error);
  }
};

export const removeStorageItem = async (itemId) => {
  try {
    await AsyncStorage.removeItem(itemId);

    clearOption(itemId);
  } catch (error) {
    logger.error(error);
  }
};

export const clearUserData = () => (
  Promise.all([
    removeStorageItem('token'),
    removeStorageItem('piiId'),
    removeStorageItem('phiId'),
    removeStorageItem('pinCode'), // HC-712. The pin should only be removed after the program deinstallation
    removeStorageItem('skipPinCode'),
    removeStorageItem('attempts')
  ])
    .then(() => Promise.resolve())
);
