import { useId } from 'react';
import PropTypes from 'prop-types';

const Input = ({
  label, id, error, hint, required, className, ...rest
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className="form-field">
      {label && (
        <label className="form-label" htmlFor={inputId}>
          {label}
          {required && <span className="form-required"> *</span>}
        </label>
      )}
      <input
        id={inputId}
        className={`form-input ${error ? 'has-error' : ''} ${className}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...rest}
      />
      {error && <span className="form-error" id={`${inputId}-error`}>{error}</span>}
      {!error && hint && <span className="form-hint">{hint}</span>}
    </div>
  );
};

Input.propTypes = {
  label: PropTypes.string,
  id: PropTypes.string,
  error: PropTypes.string,
  hint: PropTypes.string,
  required: PropTypes.bool,
  className: PropTypes.string,
};

Input.defaultProps = {
  label: '',
  id: '',
  error: '',
  hint: '',
  required: false,
  className: '',
};

export default Input;
