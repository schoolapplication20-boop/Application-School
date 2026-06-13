import { useId } from 'react';
import PropTypes from 'prop-types';

const Select = ({
  label, id, error, hint, required, options, placeholder, className, ...rest
}) => {
  const generatedId = useId();
  const selectId = id || generatedId;

  return (
    <div className="form-field">
      {label && (
        <label className="form-label" htmlFor={selectId}>
          {label}
          {required && <span className="form-required"> *</span>}
        </label>
      )}
      <select
        id={selectId}
        className={`form-select ${error ? 'has-error' : ''} ${className}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${selectId}-error` : undefined}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {error && <span className="form-error" id={`${selectId}-error`}>{error}</span>}
      {!error && hint && <span className="form-hint">{hint}</span>}
    </div>
  );
};

Select.propTypes = {
  label: PropTypes.string,
  id: PropTypes.string,
  error: PropTypes.string,
  hint: PropTypes.string,
  required: PropTypes.bool,
  placeholder: PropTypes.string,
  className: PropTypes.string,
  options: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    label: PropTypes.string.isRequired,
  })).isRequired,
};

Select.defaultProps = {
  label: '',
  id: '',
  error: '',
  hint: '',
  required: false,
  placeholder: '',
  className: '',
};

export default Select;
