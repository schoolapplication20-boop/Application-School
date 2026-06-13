import PropTypes from 'prop-types';

const Toast = ({ message, type, onClose }) => (
  <div className={`toast toast-${type}`} role="alert">
    <span className="toast-message">{message}</span>
    <button type="button" className="toast-close" onClick={onClose} aria-label="Dismiss notification">
      &times;
    </button>
  </div>
);

Toast.propTypes = {
  message: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['success', 'error', 'warning', 'info']).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default Toast;
