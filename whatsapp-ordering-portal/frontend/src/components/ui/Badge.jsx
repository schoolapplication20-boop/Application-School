import PropTypes from 'prop-types';

const Badge = ({ children, variant }) => (
  <span className={`badge badge-${variant}`}>{children}</span>
);

Badge.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['default', 'info', 'success', 'warning', 'danger']),
};

Badge.defaultProps = {
  variant: 'default',
};

export default Badge;
