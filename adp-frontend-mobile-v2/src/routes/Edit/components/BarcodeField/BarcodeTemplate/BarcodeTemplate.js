import React, {Component} from 'react';
import BarcodeView from '../BarcodeView/BarcodeViewContainer';

const barcode = (locals) => {
  return (
    <BarcodeView
      ref='barcode'
      locals={locals}
    />
  );
};

module.exports = barcode;

