import {
  Platform,
  StyleSheet
} from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
    padding: 5,
    borderRadius: 8,
  },
  buttonText: {
    textAlign: 'center',
    fontWeight: '400',
    fontSize: 14,
  },
  modal: {
    // margin: 50,
    borderWidth: 1,
    borderColor: '#DDD',
    // padding: 10,
    borderRadius: 8,
    backgroundColor: 'lightyellow',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    fontWeight: '500',
    fontSize: 14,
  },
  button: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#EEE',
    marginHorizontal: 5,
    paddingTop: 6,
    paddingBottom: 6,
    marginBottom: 8,
  },
  textboxStyle: {
    fontSize: 17,
    minHeight: 32,
    paddingVertical: (Platform.OS === 'ios') ? 7 : 0,
    paddingHorizontal: 7,
    borderRadius: 4,
    borderColor: '#cccccc',
    borderWidth: 1,
    marginBottom: 5
  }
});

export default styles;
