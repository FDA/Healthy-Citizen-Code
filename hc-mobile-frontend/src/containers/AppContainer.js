import React, {Component} from 'react';
import {Provider} from 'react-redux';
import createStore from '../store/createStore';
import HealthyCitizenApp from '../containers/HealthyCitizenAppContainer';
import {getStorageItem} from '../services/globalStorage';

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
            <Provider store={store}>
                <HealthyCitizenApp/>
            </Provider>
        );
    }
}

export default App;
