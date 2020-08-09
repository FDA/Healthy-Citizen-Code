import React, {Component, PropTypes} from 'react';
import {
  View,
  ScrollView,
  Button
} from 'react-native';
import {
  Container,
  Content
} from 'native-base';
import {CardStack} from 'react-navigation';
import TCombForm from 'tcomb-form-native';
import Loader from '../../../../components/Loader';
import styles from './FormScreenViewStyles';

const {BackButton} = CardStack.Header;

const Form = TCombForm.form.Form;

class FormScreenView extends Component {
  constructor() {
    super();

    this.state = {
      loaded: false
    };

    this.goBack = this.goBack.bind(this);
  }

  static navigationOptions = {
    title: ({state}) => state.params && state.params.title ? state.params.title : '',
    header: ({state}) => ({
      left: <BackButton onPress={() => state.params.goBack()}/>,
      right: (
        <Button
          title='Save'
          onPress={() => state.params.save()}
        />
      )
    })
  };

  componentDidMount() {
    const {navigation, screenProps: {title, save}} = this.props;

    this.setState({
      loaded: true
    });

    navigation.setParams({
      title,
      save,
      goBack: this.goBack
    });
  }

  goBack() {
    const {screenProps: {parentNavigation}} = this.props;

    parentNavigation.goBack();
  }

  render() {
    const {loaded} = this.state;
    const {screenProps: {isSaving, updateFormRef, formTypes, formOptions, formValues, onChangeValues}} = this.props;

    if (!loaded) {
      return null;
    }

    return (
      <Container>
        <Content
          contentContainerStyle={styles.content}
          scrollEnabled={false}
        >
          <ScrollView>
            <View
              style={styles.formContainer}
            >
              <Form
                type={formTypes}
                value={formValues}
                options={formOptions}
                ref={form => updateFormRef(form)}
                onChange={values => onChangeValues(values)}
              />
            </View>
          </ScrollView>
          <Loader
            isShowed={isSaving || !loaded}
          />
        </Content>
      </Container>
    );
  }
}

FormScreenView.propTypes = {
  navigation: PropTypes.object.isRequired,
  screenProps: PropTypes.object.isRequired
};

export default FormScreenView;
