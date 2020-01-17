import React, {Component} from 'react';
import LocationView from '../LocationView/LocationViewContainer';

const location = (locals) => {
  return (
    <LocationView
      ref='location_label'
      locals={locals}
    />
  );
};

module.exports = location;

