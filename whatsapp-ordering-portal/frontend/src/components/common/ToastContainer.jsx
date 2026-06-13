import PropTypes from 'prop-types';
import Toast from './Toast';

const ToastContainer = ({ toasts, onClose }) => (
  <div className="toast-container">
    {toasts.map((toast) => (
      <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => onClose(toast.id)} />
    ))}
  </div>
);

ToastContainer.propTypes = {
  toasts: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number.isRequired,
    message: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['success', 'error', 'warning', 'info']).isRequired,
  })).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ToastContainer;
