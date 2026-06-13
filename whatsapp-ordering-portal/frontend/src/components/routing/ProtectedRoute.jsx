import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../../hooks/useAuth';

const ProtectedRoute = ({ children, requireBusiness }) => {
  const { isAuthenticated, hasBusiness } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireBusiness && !hasBusiness) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  requireBusiness: PropTypes.bool,
};

ProtectedRoute.defaultProps = {
  requireBusiness: true,
};

export default ProtectedRoute;
