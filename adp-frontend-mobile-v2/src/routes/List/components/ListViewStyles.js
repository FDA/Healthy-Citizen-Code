import getStyle from '../../../themes/adp/components';
import variables from '../../../themes/adp/variables/platform';

const nativeBaseStyles = getStyle();
const platform = variables.platform;

const styles = {
  container: {
    flex: 1
  },
  content: {
    flex: 1
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',

    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,

    backgroundColor: 'rgba(0, 0, 0, 0.1)',

    zIndex: 1
  },
  menuContext: {
    flex: 1
  },
  menuTrigger: {
    paddingVertical: (platform === 'ios') ? 12 : 10,
    paddingLeft: (platform === 'ios') ? 10 : null,
  },
  menuOptions: {
    marginTop: 10
  },
  menuOptionText: {
    marginRight: 20
  },
  menuOptionArrowIcon: {
    position: 'absolute',
    top: 8,
    right: 12,

    fontSize: 20
  },
  sortIcon: {
    width: 30,
    height: 30,
    backgroundColor: 'transparent',
    marginLeft: 5,
  },
  searchCloseBtn: {
    height: null,

    paddingTop: 6,
    paddingLeft: 0,
    paddingRight: 2
  },
  searchCloseIcon: {
    fontSize: 22,
    color: variables.dropdownLinkColor
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // padding: 10
  },
  emptyText: {
    fontSize: 20,
    color: '#ccc'
  },
  gridHeader: {

    marginLeft: 0,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 5,
    paddingRight: 0,

    backgroundColor: '#eee'
  },
  rowHeader: {
    marginLeft: 0,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 5,

    backgroundColor: '#fff'
  },
  rowHeaderOpened: {
    backgroundColor: '#eee'
  },
  rowHeaderSelected: {
    backgroundColor: '#feffd9'
  },
  column: {
    // borderRightWidth: nativeBaseStyles['NativeBase.ListItem'].borderBottomWidth,
    borderRightWidth: 1,
    maxHeight: 40,
    borderColor: nativeBaseStyles['NativeBase.ListItem'].borderColor
  },
  columnHeader: {
    borderColor: '#aaa'
  },
  columnLast: {
    borderRightWidth: 0
  },
  columnContent: {
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 5,
    paddingRight: 5
  },
  columnContentWithArrow: {
    paddingRight: 30
  },
  columnName: {
    marginBottom: 0,
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000'
  },
  columnValue: {
    fontSize: 13,
  },
  arrowIcon: {
    position: 'absolute',
    top: 4,
    right: 12,
  },
  rowContent: {
    paddingHorizontal: 15,
    paddingTop: 5,
    paddingBottom: 10,

    backgroundColor: '#f6f6f6',
    borderBottomWidth: nativeBaseStyles['NativeBase.ListItem'].borderBottomWidth,
    borderColor: nativeBaseStyles['NativeBase.ListItem'].borderColor
  },
  rowValue: {},
  fieldName: {
    marginTop: 5,

    fontSize: 13,
    fontWeight: 'bold',
    color: '#000'
  },
  fieldValue: {
    fontSize: 13,
    color: '#000'
  },
  modal: {
    alignSelf: 'center',
    minWidth: 300
  }
};

export default styles;

