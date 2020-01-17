import {
    Platform
} from 'react-native';

const styles = {
    container: {
        flex: 1,
        backgroundColor: '#2196f3'
    },
    gradientContainer: {
        flex: 1
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    loadingContainer: {},
    loadingText: {
        fontSize: 20,
        color: '#fff',
        textAlign: 'center'
    },
    form: {
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: (Platform.OS === 'ios') ? 0 : null,
        paddingBottom: 30
    },
    title: {
        fontWeight: 'bold',
        fontSize: 24,
        color: '#fff'
    },
    result: {
        flexDirection: 'row',

        marginTop: 15,
        marginBottom: 10
    },
    resultItem: {
        width: 10,
        height: 10,

        marginHorizontal: 10,

        borderColor: '#fff',
        borderWidth: 1,

        borderRadius: 10
    },
    resultItemSelected: {
        backgroundColor: '#fff'
    },
    resultTextContainer: {
        marginTop: 10
    },
    attemptsText: {
        fontSize: 18,
        color: '#fff',
        textAlign: 'center'
    },
    errorText: {
        marginTop: 0,
        padding: 10,
        fontSize: 16,
        color: '#ffffff',
        textAlign: 'center',
        borderWidth: 1,
        borderRadius: 10,
        overflow: 'hidden',
        borderColor: '#ffffff',
        backgroundColor: '#cc3333'
    },
    keyboardGridContainer: {
        maxWidth: 350,
        maxHeight: 350,
        padding: 20,
        paddingBottom: 0
    },
    keyboardGrid: {
        flex: 1,
        flexDirection: 'row'
    },
    keyboardGridColumn: {
        flex: 1
    },
    keyboardGridCell: {
        flex: 1
    },
    keyboardKeyRow: {
        alignItems: 'center',
        justifyContent: 'center'
    },
    keyboardKeyNumber: {
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        width: 70,
        height: 70,
        borderColor: '#fff',
        borderWidth: 2,
        borderRadius: 70
    },
    keyboardKeyButton: {
        flex: 1,
        alignSelf: 'center',

        justifyContent: 'center',
        alignItems: 'center'
    },
    keyboardButtonIcon: {
        fontSize: 40,
        color: '#fff'
    },
    keyboardKeyText: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#fff'
    },
    keyboardButtonText: {
        fontSize: 13,
        color: '#fff'
    }
};

export default styles;
