import GlobalConfig from 'react-native-config';

const Config = {
  api: {
    host: GlobalConfig.API_URL,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  }
};

export default Config;
