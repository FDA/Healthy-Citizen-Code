import {
  Platform
} from 'react-native';

const styles = {
  headerBody: {
    marginHorizontal: Platform.OS === 'android' ? 16 : 0
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(0, 0, 0, .9)',
    textAlign: Platform.OS === 'android' ? 'left' : 'center'
  },
  headerSubTitle: {
    color: 'rgba(0, 0, 0, .9)',
    textAlign: Platform.OS === 'android' ? 'left' : 'center'
  },
  container: {
    backgroundColor: '#06566F'
  },
  content: {
    flex: 1
  },
  buttonsGrid: {
  },
  buttonsColumn: {
    flex: 1
  },
  buttonLink: {
    flex: 1
  },
  buttonView: {
    flex: 1,
    flexDirection: 'column',

    paddingHorizontal: 50,
    paddingTop: 15,
    paddingBottom: 40
  },
  buttonIcon: {
    flex: 1
  },
  buttonCount: {
    fontSize: 20,
    fontWeight: '500',
    color: '#fff',
    textAlign: 'center'
  },
  buttonTitle: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,

    fontSize: 20,
    fontWeight: '500',
    color: '#fff',
    textAlign: 'center'
  }
};

export default styles;
