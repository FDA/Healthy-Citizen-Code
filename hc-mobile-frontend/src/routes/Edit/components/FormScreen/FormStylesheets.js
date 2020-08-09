import {
    Platform
} from 'react-native';

const LABEL_COLOR = '#000000';
const INPUT_COLOR = '#000000';
const ERROR_COLOR = '#a94442';
const HELP_COLOR = '#999999';
const BORDER_COLOR = '#cccccc';
const DISABLED_COLOR = '#777777';
const DISABLED_BACKGROUND_COLOR = '#eeeeee';
const FONT_SIZE = 17;
const FONT_WEIGHT = '200';

const stylesheet = {
    fieldset: {
        position: 'relative'
    },
    // the style applied to the container of all inputs
    formGroup: {
        normal: {
            marginBottom: 10
        },
        error: {
            marginBottom: 10
        }
    },
    controlLabel: {
        normal: {
            color: LABEL_COLOR,
            fontSize: FONT_SIZE,
            marginBottom: 4,
            fontWeight: FONT_WEIGHT
        },
        // the style applied when a validation error occours
        error: {
            color: ERROR_COLOR,
            fontSize: FONT_SIZE,
            marginBottom: 7,
            fontWeight: FONT_WEIGHT
        }
    },
    helpButton: {
        position: 'absolute',
        top: 3,
        right: 4,

        backgroundColor: 'transparent',

        color: '#62B1F6'
    },
    helpBlock: {
        normal: {
            color: HELP_COLOR,
            fontSize: FONT_SIZE,
            marginBottom: 2
        },
        // the style applied when a validation error occours
        error: {
            color: HELP_COLOR,
            fontSize: FONT_SIZE,
            marginBottom: 2
        }
    },
    errorBlock: {
        fontSize: FONT_SIZE,
        marginBottom: 2,
        color: ERROR_COLOR
    },
    textboxView: {
        normal: {},
        error: {},
        notEditable: {}
    },
    textbox: {
        normal: {
            color: INPUT_COLOR,
            fontSize: FONT_SIZE,
            height: 36,
            paddingVertical: (Platform.OS === 'ios') ? 7 : 0,
            paddingHorizontal: 7,
            borderRadius: 4,
            borderColor: BORDER_COLOR,
            borderWidth: 1,
            marginBottom: 5
        },
        // the style applied when a validation error occours
        error: {
            color: INPUT_COLOR,
            fontSize: FONT_SIZE,
            height: 36,
            paddingVertical: (Platform.OS === 'ios') ? 7 : 0,
            paddingHorizontal: 7,
            borderRadius: 4,
            borderColor: ERROR_COLOR,
            borderWidth: 1,
            marginBottom: 5
        },
        // the style applied when the textbox is not editable
        notEditable: {
            fontSize: FONT_SIZE,
            height: 36,
            paddingVertical: (Platform.OS === 'ios') ? 7 : 0,
            paddingHorizontal: 7,
            borderRadius: 4,
            borderColor: BORDER_COLOR,
            borderWidth: 1,
            marginBottom: 5,
            color: DISABLED_COLOR,
            backgroundColor: DISABLED_BACKGROUND_COLOR
        }
    },
    textboxWithHelp: {
        paddingRight: 40
    },
    checkbox: {
        normal: {
            marginBottom: 4
        },
        // the style applied when a validation error occours
        error: {
            marginBottom: 4
        }
    },
    pickerContainer: {
        normal: {
            marginBottom: 4,
            borderRadius: 4,
            borderColor: BORDER_COLOR,
            borderWidth: 1
        },
        error: {
            borderColor: ERROR_COLOR
        },
        open: {
            // Alter styles when select container is open
        }
    },
    select: {
        normal: Platform.select({
            android: {
                paddingLeft: 7,
                color: INPUT_COLOR
            },
            ios: {
            }
        }),
        // the style applied when a validation error occours
        error: Platform.select({
            android: {
                paddingLeft: 7,
                color: ERROR_COLOR
            },
            ios: {}
        })
    },
    pickerTouchable: {
        normal: {
            height: 35,
            flexDirection: 'row',
            alignItems: 'center'
        },
        error: {
            height: 35,
            flexDirection: 'row',
            alignItems: 'center'
        },
        active: {
            borderBottomWidth: 1,
            borderColor: BORDER_COLOR
        }
    },
    pickerValue: {
        normal: {
            fontSize: FONT_SIZE,
            paddingLeft: 7
        },
        error: {
            fontSize: FONT_SIZE,
            paddingLeft: 7
        }
    },
    datepicker: {
        normal: {
            marginBottom: 4
        },
        // the style applied when a validation error occours
        error: {
            marginBottom: 4
        }
    },
    dateTouchable: {
        normal: {
            marginBottom: 4,
            borderRadius: 4,
            borderColor: '#ccc',
            borderWidth: 1
        },
        error: {
            marginBottom: 4,
            borderRadius: 4,
            borderColor: '#ccc',
            borderWidth: 1
        }
    },
    dateValue: {
        normal: {
            color: INPUT_COLOR,
            fontSize: FONT_SIZE,
            padding: 7,
            marginBottom: 1
        },
        error: {
            color: ERROR_COLOR,
            fontSize: FONT_SIZE,
            padding: 7,
            marginBottom: 1
        }
    },
    dateCloseTouchable: {
        position: 'absolute',
        top: 0,
        right: 0,

    },
    dateCloseTouchableWithHelp: {
        right: 40
    },
    dateCloseButton: {
        normal: {
            color: BORDER_COLOR, //INPUT_COLOR,
            fontSize: 24,
            padding: 6
        },
        error: {
            color: ERROR_COLOR,
            fontSize: 24,
            padding: 6
        }
    },
    buttonText: {
        fontSize: 18,
        color: 'white',
        alignSelf: 'center'
    },
    button: {
        height: 36,
        backgroundColor: '#48BBEC',
        borderColor: '#48BBEC',
        borderWidth: 1,
        borderRadius: 8,
        marginBottom: 10,
        alignSelf: 'stretch',
        justifyContent: 'center'
    }
};

export default stylesheet;
