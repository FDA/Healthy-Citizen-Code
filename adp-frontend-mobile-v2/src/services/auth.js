import apiAuth from '../api/auth';
import * as Keychain from "react-native-keychain";
import AuthAPI from "../api/auth";
import {logout} from '../redux/reducers/auth';
import {setStorageItem} from "./globalStorage";
import {setOption} from "./localStorage";
import logger from './logger';

const checkToken = token => (
  new Promise((resolve, reject) => {
    apiAuth.checkToken(token)
      .then(response => resolve())
      .catch(error => reject(error.message));
  })
);

const getNewAuthByStoredCredentials = async () => {
  try {
    const {username, password} = await Keychain.getGenericPassword();
    if (!username) {
      return null;
    }
    return (await AuthAPI.authNoAlert(username, password)).data;
  } catch (e) {
    return null;
  }
};

const saveAuth = async (authData) => {
  const token = authData.token;
  const userRecordId = authData.user.userRecordId;
  const userId = authData.user.id;
  setOption('token', token);
  setOption('userRecordId', userRecordId);
  setOption('id', userId);

  return Promise.all([
    setStorageItem('token', token),
    setStorageItem('userRecordId', userRecordId),
    setStorageItem('id', userId),
  ]);
};

const reAuth = async () => {
  const newAuth = await getNewAuthByStoredCredentials();
  if (newAuth) {
    return saveAuth(newAuth);
  }
  logout();
};

module.exports = {
  checkToken,
  getNewAuthByStoredCredentials,
  saveAuth,
  reAuth,
};
