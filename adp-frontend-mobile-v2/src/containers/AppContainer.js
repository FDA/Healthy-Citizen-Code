import React, {Component} from 'react';
import {Provider} from 'react-redux';
import createStore from '../store/createStore';
import ADPApp from '../containers/ADPAppContainer';
import {getStorageItem} from '../services/globalStorage';
import {Root} from 'native-base';

class App extends Component {
  constructor() {
    super();

    this.state = {
      loaded: false
    };

    this.getStorageItems = this.getStorageItems.bind(this);
  }

  componentDidMount() {
    this.getStorageItems().done();
  }

  async getStorageItems() {
    await getStorageItem('pinCode');
    await getStorageItem('skipPinCode');
    await getStorageItem('token');
    await getStorageItem('attempts');

    this.setState({
      loaded: true
    });
  }

  render() {
    const {loaded} = this.state;

    if (!loaded) {
      return null;
    }

    const store = createStore({});
    return (
      <Root>
        <Provider store={store}>
          <ADPApp/>
        </Provider>
      </Root>
    );
  }
}

export default App;
