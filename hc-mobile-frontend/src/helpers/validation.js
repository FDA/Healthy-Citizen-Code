export const validateEditForm = values => {
  const errors = {};
  const requiredFields = [
    'firstname',
    'lastname',
    'email',
    'zip'
  ];

  requiredFields.forEach(field => {
    if (!values[field]) {
      errors[field] = 'Required';
    }
  });

  if (values.email && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(values.email)) {
    errors.email = 'Invalid email address';
  }

  return errors;
};
