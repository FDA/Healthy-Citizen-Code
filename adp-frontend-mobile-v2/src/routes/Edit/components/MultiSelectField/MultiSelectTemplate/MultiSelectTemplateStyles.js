import {
    Platform
} from 'react-native';

const styles = {
    container: {},
    content: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center'
    },
    contentWithHelp: {
        backgroundColor: '#f6f6f6',
        borderRadius: 5,
        marginRight: 40,
        alignSelf: 'stretch'
    },
    list: {
        flex: 0.8,
        alignItems: 'flex-start',
        minHeight: Platform.OS === 'android' ? 46 : 36,
        marginRight: 10,
        padding: 3,
        backgroundColor: '#f6f6f6',
        alignSelf: 'stretch',
        borderRadius: 5
    },
    touchable: {
    },
    item: {
        margin: 2,
        paddingVertical: 2,
        paddingHorizontal: 3,
        backgroundColor: '#ccc',
        borderRadius: 3,
        overflow: 'hidden'
    },
    fullButton: {
        height: 37,
        marginBottom: 5
    },
    viewIcon: {
        fontSize: 30,
        color: '#000'
    }
};

export default styles;
