const styles = {
  container: {
    flex: 1,

    backgroundColor:'#2196f3'
  },
  gradientContainer: {
    flex: 1
  },
  content: {
    flex: 1,

    justifyContent: 'center',
    alignItems: 'center',

    paddingTop: 10,
    paddingBottom: 130
  },
  logoContainer: {
    width: 200,
    height: 200,

    justifyContent: 'center',
    alignItems: 'center'
  },
  logo: {
    // width: 139,
    // height: 217,
    flex: 1,
    resizeMode: 'contain'
  },
  form: {
    width: 260
  },
  row: {
    marginTop: 15,

    backgroundColor: '#EEEEF4'
  },
  field: {
    height: 50,

    marginLeft: 10,
    marginRight: 10,
    paddingTop: 0,
    paddingBottom: 0,

    fontSize: 16,
    color: '#000',
    textAlign: 'left'
  },
  submitBtnContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0
  },
  submitBtn: {
    backgroundColor: '#055571'
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff'
  }
};

export default styles;
