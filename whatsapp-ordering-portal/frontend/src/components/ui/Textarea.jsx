import { useId } from 'react';
import PropTypes from 'prop-types';

const Textarea = ({
  label, id, error, hint, required, className, ...rest
}) => {
  const generatedId = useId();
  const textareaId = id || generatedId;

  return (
    <div className="form-field">
      {label && (
        <label className="form-label" htmlFor={textareaId}>
          {label}
          {required && <span className="form-required"> *</span>}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`form-textarea ${error ? 'has-error' : ''} ${className}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${textareaId}-error` : undefined}
        {...rest}
      />
      {error && <span className="form-error" id={`${textareaId}-error`}>{error}</span>}
      {!error && hint && <span className="form-hint">{hint}</span>}
    </div>
  );
};

Textarea.propTypes = {
  label: PropTypes.string,
  id: PropTypes.string,
  error: PropTypes.string,
  hint: PropTypes.string,
  required: PropTypes.bool,
  className: PropTypes.string,
};

Textarea.defaultProps = {
  label: '',
  id: '',
  error: '',
  hint: '',
  required: false,
  className: '',
};

export default Textarea;
