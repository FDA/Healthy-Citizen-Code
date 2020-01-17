import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
} from 'react-native';
import FileChooser from '../../../../../components/FileChooser';

class UploadFieldTemplate extends Component {
  constructor(props) {
    super(props);

    this.uploadCallback = this.uploadCallback.bind(this);
  }

  uploadCallback(uploadedFiles) {
    const {locals} = this.props;
    locals.onChange(uploadedFiles);
  }

  render() {
    const {locals} = this.props;
    if (locals.hidden) {
      return null;
    }

    return (
      <FileChooser
        ref='fileuploader'
        locals={locals}
        uploadCallback={this.uploadCallback}
      />
    );
  }
};

UploadFieldTemplate.propTypes = {
  locals: PropTypes.object.isRequired
};

const upload = (locals) => {
  if (locals.hidden) {
    return null;
  }

  const stylesheet = locals.stylesheet;
  const label = locals.label ? <Text>{locals.label}</Text> : null;
  return (
    <View style={{marginBottom: 10}}>
      {label}
      <View>
        <UploadFieldTemplate
          ref='uploadfieldtemplate'
          locals={locals}
        />
      </View>
    </View>
  );
};

export default upload;