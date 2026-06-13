import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useBusiness } from '../../hooks/useBusiness';
import { useToast } from '../../hooks/useToast';
import * as businessService from '../../services/businessService';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import { BUSINESS_TYPE_LABELS } from '../../utils/constants';
import { isRequired, isValidPhone, isValidUrl } from '../../utils/validators';
import { getErrorMessage } from '../../utils/errors';

const BUSINESS_TYPE_OPTIONS = Object.entries(BUSINESS_TYPE_LABELS).map(([value, label]) => ({ value, label }));

const businessFormFromBusiness = (business) => ({
  businessName: business?.business_name || '',
  businessType: business?.business_type || '',
  phoneNumber: business?.phone_number || '',
  whatsappNumber: business?.whatsapp_number || '',
  address: business?.address || '',
  city: business?.city || '',
  postalCode: business?.postal_code || '',
  websiteUrl: business?.website_url || '',
});

const whatsappFormFromConfig = (config) => ({
  phoneNumberId: config?.phone_number_id || '',
  accessToken: '',
  whatsappBusinessAccountId: config?.whatsapp_business_account_id || '',
  webhookUrl: config?.webhook_url || '',
  webhookVerifyToken: '',
});

const SettingsPage = () => {
  const { businessId } = useAuth();
  const { business, whatsappConfig, refreshBusiness, refreshWhatsappConfig } = useBusiness();
  const toast = useToast();

  const [businessForm, setBusinessForm] = useState(businessFormFromBusiness(business));
  const [businessErrors, setBusinessErrors] = useState({});
  const [businessFormError, setBusinessFormError] = useState('');
  const [businessLoading, setBusinessLoading] = useState(false);

  const [whatsappForm, setWhatsappForm] = useState(whatsappFormFromConfig(whatsappConfig));
  const [whatsappErrors, setWhatsappErrors] = useState({});
  const [whatsappFormError, setWhatsappFormError] = useState('');
  const [whatsappLoading, setWhatsappLoading] = useState(false);

  useEffect(() => {
    setBusinessForm(businessFormFromBusiness(business));
  }, [business]);

  useEffect(() => {
    setWhatsappForm(whatsappFormFromConfig(whatsappConfig));
  }, [whatsappConfig]);

  const handleBusinessChange = (event) => {
    const { name, value } = event.target;
    setBusinessForm((current) => ({ ...current, [name]: value }));
  };

  const handleWhatsappChange = (event) => {
    const { name, value } = event.target;
    setWhatsappForm((current) => ({ ...current, [name]: value }));
  };

  const validateBusiness = () => {
    const nextErrors = {};
    const trimmedName = businessForm.businessName.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      nextErrors.businessName = 'Business name must be between 2 and 100 characters';
    }
    if (!isRequired(businessForm.businessType)) nextErrors.businessType = 'Select a business type';
    if (businessForm.phoneNumber && !isValidPhone(businessForm.phoneNumber)) nextErrors.phoneNumber = 'Enter a valid phone number';
    if (businessForm.whatsappNumber && !isValidPhone(businessForm.whatsappNumber)) {
      nextErrors.whatsappNumber = 'Enter a valid WhatsApp number';
    }
    if (businessForm.websiteUrl && !isValidUrl(businessForm.websiteUrl)) nextErrors.websiteUrl = 'Enter a valid URL';
    setBusinessErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleBusinessSubmit = async (event) => {
    event.preventDefault();
    setBusinessFormError('');
    if (!validateBusiness()) return;

    setBusinessLoading(true);
    try {
      await businessService.updateBusiness(businessId, {
        business_name: businessForm.businessName.trim(),
        business_type: businessForm.businessType,
        phone_number: businessForm.phoneNumber || undefined,
        whatsapp_number: businessForm.whatsappNumber || undefined,
        address: businessForm.address || undefined,
        city: businessForm.city || undefined,
        postal_code: businessForm.postalCode || undefined,
        website_url: businessForm.websiteUrl || undefined,
      });
      await refreshBusiness();
      toast.success('Business profile updated');
    } catch (error) {
      setBusinessFormError(getErrorMessage(error, 'Unable to update business profile'));
    } finally {
      setBusinessLoading(false);
    }
  };

  const validateWhatsapp = () => {
    const nextErrors = {};
    if (!whatsappConfig && !isRequired(whatsappForm.phoneNumberId)) nextErrors.phoneNumberId = 'Phone number ID is required';
    if (!whatsappConfig && !isRequired(whatsappForm.accessToken)) nextErrors.accessToken = 'Access token is required';
    if (whatsappForm.webhookUrl && !isValidUrl(whatsappForm.webhookUrl)) nextErrors.webhookUrl = 'Enter a valid URL';
    setWhatsappErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleWhatsappSubmit = async (event) => {
    event.preventDefault();
    setWhatsappFormError('');
    if (!validateWhatsapp()) return;

    setWhatsappLoading(true);
    try {
      if (whatsappConfig) {
        await businessService.updateWhatsappConfig({
          phone_number_id: whatsappForm.phoneNumberId || undefined,
          access_token: whatsappForm.accessToken || undefined,
          whatsapp_business_account_id: whatsappForm.whatsappBusinessAccountId || undefined,
          webhook_url: whatsappForm.webhookUrl || undefined,
          webhook_verify_token: whatsappForm.webhookVerifyToken || undefined,
        });
      } else {
        await businessService.setupWhatsappConfig({
          phone_number_id: whatsappForm.phoneNumberId.trim(),
          access_token: whatsappForm.accessToken.trim(),
          whatsapp_business_account_id: whatsappForm.whatsappBusinessAccountId || undefined,
          webhook_url: whatsappForm.webhookUrl || undefined,
          webhook_verify_token: whatsappForm.webhookVerifyToken || undefined,
        });
      }
      await refreshWhatsappConfig();
      toast.success('WhatsApp settings saved');
    } catch (error) {
      setWhatsappFormError(getErrorMessage(error, 'Unable to save WhatsApp settings'));
    } finally {
      setWhatsappLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Settings</h2>
      </div>

      <div className="card section-card mb-lg">
        <h3>Business profile</h3>
        {businessFormError && <div className="form-banner form-banner-error">{businessFormError}</div>}
        <form onSubmit={handleBusinessSubmit}>
          <Input
            label="Business name"
            name="businessName"
            value={businessForm.businessName}
            onChange={handleBusinessChange}
            error={businessErrors.businessName}
            required
          />
          <Select
            label="Business type"
            name="businessType"
            value={businessForm.businessType}
            onChange={handleBusinessChange}
            error={businessErrors.businessType}
            options={BUSINESS_TYPE_OPTIONS}
            placeholder="Select a type"
            required
          />
          <div className="form-row">
            <Input
              label="Business phone number"
              name="phoneNumber"
              value={businessForm.phoneNumber}
              onChange={handleBusinessChange}
              error={businessErrors.phoneNumber}
              hint="e.g. +919876543210"
            />
            <Input
              label="WhatsApp number"
              name="whatsappNumber"
              value={businessForm.whatsappNumber}
              onChange={handleBusinessChange}
              error={businessErrors.whatsappNumber}
              hint="e.g. +919876543210"
            />
          </div>
          <Input
            label="Address"
            name="address"
            value={businessForm.address}
            onChange={handleBusinessChange}
            error={businessErrors.address}
          />
          <div className="form-row">
            <Input
              label="City"
              name="city"
              value={businessForm.city}
              onChange={handleBusinessChange}
              error={businessErrors.city}
            />
            <Input
              label="Postal code"
              name="postalCode"
              value={businessForm.postalCode}
              onChange={handleBusinessChange}
              error={businessErrors.postalCode}
            />
          </div>
          <Input
            label="Website URL"
            name="websiteUrl"
            value={businessForm.websiteUrl}
            onChange={handleBusinessChange}
            error={businessErrors.websiteUrl}
            hint="https://example.com"
          />
          <Button type="submit" loading={businessLoading}>Save business profile</Button>
        </form>
      </div>

      <div className="card section-card">
        <h3>WhatsApp Business API</h3>
        <p className="text-muted">
          {whatsappConfig?.is_configured
            ? `Connected${whatsappConfig.is_verified ? ' and verified' : ''}.`
            : 'Connect your WhatsApp Business Cloud API credentials so customers can place orders.'}
        </p>
        {whatsappFormError && <div className="form-banner form-banner-error">{whatsappFormError}</div>}
        <form onSubmit={handleWhatsappSubmit}>
          <Input
            label="Phone number ID"
            name="phoneNumberId"
            value={whatsappForm.phoneNumberId}
            onChange={handleWhatsappChange}
            error={whatsappErrors.phoneNumberId}
            required={!whatsappConfig}
          />
          <Input
            label="Access token"
            name="accessToken"
            type="password"
            value={whatsappForm.accessToken}
            onChange={handleWhatsappChange}
            error={whatsappErrors.accessToken}
            required={!whatsappConfig}
            hint={whatsappConfig ? 'Leave blank to keep the current access token' : ''}
          />
          <Input
            label="WhatsApp Business Account ID"
            name="whatsappBusinessAccountId"
            value={whatsappForm.whatsappBusinessAccountId}
            onChange={handleWhatsappChange}
            error={whatsappErrors.whatsappBusinessAccountId}
          />
          <Input
            label="Webhook URL"
            name="webhookUrl"
            value={whatsappForm.webhookUrl}
            onChange={handleWhatsappChange}
            error={whatsappErrors.webhookUrl}
            hint="https://your-domain.com/api/v1/whatsapp/webhook"
          />
          <Input
            label="Webhook verify token"
            name="webhookVerifyToken"
            value={whatsappForm.webhookVerifyToken}
            onChange={handleWhatsappChange}
            error={whatsappErrors.webhookVerifyToken}
            hint={whatsappConfig ? 'Leave blank to keep the current verify token' : ''}
          />
          <Button type="submit" loading={whatsappLoading}>Save WhatsApp settings</Button>
        </form>
      </div>
    </div>
  );
};

export default SettingsPage;
