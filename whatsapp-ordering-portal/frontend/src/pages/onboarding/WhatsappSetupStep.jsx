import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '../../hooks/useBusiness';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import * as businessService from '../../services/businessService';
import { isRequired, isValidUrl } from '../../utils/validators';
import { getErrorMessage } from '../../utils/errors';

const WhatsappSetupStep = () => {
  const { refreshWhatsappConfig } = useBusiness();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    phoneNumberId: '',
    accessToken: '',
    whatsappBusinessAccountId: '',
    webhookUrl: '',
    webhookVerifyToken: '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!isRequired(form.phoneNumberId)) nextErrors.phoneNumberId = 'Phone number ID is required';
    if (!isRequired(form.accessToken)) nextErrors.accessToken = 'Access token is required';
    if (form.webhookUrl && !isValidUrl(form.webhookUrl)) nextErrors.webhookUrl = 'Enter a valid URL';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const goToDashboard = () => navigate('/dashboard', { replace: true });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    if (!validate()) return;

    setLoading(true);
    try {
      await businessService.setupWhatsappConfig({
        phone_number_id: form.phoneNumberId.trim(),
        access_token: form.accessToken.trim(),
        whatsapp_business_account_id: form.whatsappBusinessAccountId || undefined,
        webhook_url: form.webhookUrl || undefined,
        webhook_verify_token: form.webhookVerifyToken || undefined,
      });
      await refreshWhatsappConfig();
      goToDashboard();
    } catch (error) {
      setFormError(getErrorMessage(error, 'Unable to save WhatsApp settings. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2>Connect WhatsApp</h2>
      <p>
        Connect your WhatsApp Business Cloud API credentials so customers can place orders.
        You can also do this later from Settings.
      </p>
      {formError && <div className="form-banner form-banner-error">{formError}</div>}
      <form onSubmit={handleSubmit}>
        <Input
          label="Phone number ID"
          id="phoneNumberId"
          name="phoneNumberId"
          value={form.phoneNumberId}
          onChange={handleChange}
          error={errors.phoneNumberId}
          required
        />
        <Input
          label="Access token"
          id="accessToken"
          name="accessToken"
          type="password"
          value={form.accessToken}
          onChange={handleChange}
          error={errors.accessToken}
          required
        />
        <Input
          label="WhatsApp Business Account ID"
          id="whatsappBusinessAccountId"
          name="whatsappBusinessAccountId"
          value={form.whatsappBusinessAccountId}
          onChange={handleChange}
          error={errors.whatsappBusinessAccountId}
        />
        <Input
          label="Webhook URL"
          id="webhookUrl"
          name="webhookUrl"
          value={form.webhookUrl}
          onChange={handleChange}
          error={errors.webhookUrl}
          hint="https://your-domain.com/api/v1/whatsapp/webhook"
        />
        <Input
          label="Webhook verify token"
          id="webhookVerifyToken"
          name="webhookVerifyToken"
          value={form.webhookVerifyToken}
          onChange={handleChange}
          error={errors.webhookVerifyToken}
        />
        <Button type="submit" block loading={loading}>Save and continue</Button>
      </form>
      <div className="auth-footer">
        <Button variant="ghost" size="sm" onClick={goToDashboard}>Skip for now</Button>
      </div>
    </>
  );
};

export default WhatsappSetupStep;
