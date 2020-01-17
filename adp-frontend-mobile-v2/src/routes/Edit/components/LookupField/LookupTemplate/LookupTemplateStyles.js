import {
  Platform
} from 'react-native';

const styles = {
  container: {
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center'
  },
  contentWithHelp: {
    paddingRight: 40
  },
  field: {
    flex: 0.8,

    height: Platform.OS === 'android' ? 46 : 44,

    marginRight: 10,

    backgroundColor: '#f6f6f6'
  },
  fullButton: {
    height: 37,
    marginBottom: 5
  }
};

export default styles;
