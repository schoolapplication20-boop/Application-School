import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../../hooks/useAuth';

const GuestRoute = ({ children }) => {
  const { isAuthenticated, hasBusiness } = useAuth();

  if (isAuthenticated) {
    return <Navigate to={hasBusiness ? '/dashboard' : '/onboarding'} replace />;
  }

  return children;
};

GuestRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

export default GuestRoute;
