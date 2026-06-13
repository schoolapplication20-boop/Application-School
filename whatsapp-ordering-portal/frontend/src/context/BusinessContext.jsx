import { createContext, useState, useCallback, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import * as businessService from '../services/businessService';
import { useAuth } from '../hooks/useAuth';

export const BusinessContext = createContext(null);

export const BusinessProvider = ({ children }) => {
  const { businessId, isAuthenticated } = useAuth();
  const [business, setBusiness] = useState(null);
  const [whatsappConfig, setWhatsappConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshBusiness = useCallback(async () => {
    if (!businessId) {
      setBusiness(null);
      return null;
    }
    const result = await businessService.getBusiness(businessId);
    setBusiness(result.business);
    return result.business;
  }, [businessId]);

  const refreshWhatsappConfig = useCallback(async () => {
    if (!businessId) {
      setWhatsappConfig(null);
      return null;
    }
    const result = await businessService.getWhatsappConfig();
    setWhatsappConfig(result.whatsapp_config);
    return result.whatsapp_config;
  }, [businessId]);

  useEffect(() => {
    if (!isAuthenticated || !businessId) {
      setBusiness(null);
      setWhatsappConfig(null);
      return undefined;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([refreshBusiness(), refreshWhatsappConfig()])
      .catch((err) => {
        if (isMounted) setError(err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, businessId, refreshBusiness, refreshWhatsappConfig]);

  const value = useMemo(() => ({
    business,
    whatsappConfig,
    loading,
    error,
    refreshBusiness,
    refreshWhatsappConfig,
    setBusiness,
  }), [business, whatsappConfig, loading, error, refreshBusiness, refreshWhatsappConfig]);

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
};

BusinessProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
