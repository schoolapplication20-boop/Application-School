import { useId } from 'react';
import PropTypes from 'prop-types';

const Checkbox = ({ label, id, className, ...rest }) => {
  const generatedId = useId();
  const checkboxId = id || generatedId;

  return (
    <div className="form-checkbox-field">
      <input id={checkboxId} type="checkbox" className={className} {...rest} />
      {label && <label className="form-label" htmlFor={checkboxId}>{label}</label>}
    </div>
  );
};

Checkbox.propTypes = {
  label: PropTypes.string,
  id: PropTypes.string,
  className: PropTypes.string,
};

Checkbox.defaultProps = {
  label: '',
  id: '',
  className: '',
};

export default Checkbox;
