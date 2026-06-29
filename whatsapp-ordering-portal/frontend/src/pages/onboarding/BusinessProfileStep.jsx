import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../../hooks/useAuth';
import { useBusiness } from '../../hooks/useBusiness';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import * as businessService from '../../services/businessService';
import { BUSINESS_TYPE_LABELS } from '../../utils/constants';
import { isValidPhone, isValidUrl } from '../../utils/validators';
import { getErrorMessage } from '../../utils/errors';

const BUSINESS_TYPE_OPTIONS = Object.entries(BUSINESS_TYPE_LABELS).map(([value, label]) => ({ value, label }));

const BusinessProfileStep = ({ onComplete, updateData }) => {
  const { applyBusinessTokens, businessId } = useAuth();
  const { business, setBusiness } = useBusiness();

  const [form, setForm] = useState({
    businessName: '',
    businessType: '',
    phoneNumber: '',
    whatsappNumber: '',
    address: '',
    city: '',
    postalCode: '',
    websiteUrl: '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (business) {
      setForm({
        businessName:  business.business_name  || '',
        businessType:  business.business_type  || '',
        phoneNumber:   business.phone_number   || '',
        whatsappNumber:business.whatsapp_number|| '',
        address:       business.address        || '',
        city:          business.city           || '',
        postalCode:    business.postal_code    || '',
        websiteUrl:    business.website_url    || '',
      });
    }
  }, [business]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const validate = () => {
    const nextErrors = {};
    const trimmedName = form.businessName.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      nextErrors.businessName = 'Business name must be between 2 and 100 characters';
    }
    if (!form.businessType) nextErrors.businessType = 'Select a business type';
    if (form.phoneNumber && !isValidPhone(form.phoneNumber)) nextErrors.phoneNumber = 'Enter a valid phone number';
    if (form.whatsappNumber && !isValidPhone(form.whatsappNumber)) nextErrors.whatsappNumber = 'Enter a valid WhatsApp number';
    if (form.websiteUrl && !isValidUrl(form.websiteUrl)) nextErrors.websiteUrl = 'Enter a valid URL';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        business_name:   form.businessName.trim(),
        business_type:   form.businessType,
        phone_number:    form.phoneNumber   || undefined,
        whatsapp_number: form.whatsappNumber|| undefined,
        address:         form.address       || undefined,
        city:            form.city          || undefined,
        postal_code:     form.postalCode    || undefined,
        website_url:     form.websiteUrl    || undefined,
      };

      let result;
      if (businessId) {
        result = await businessService.updateBusiness(businessId, payload);
        setBusiness(result.business);
      } else {
        result = await businessService.createBusiness(payload);
        applyBusinessTokens({ access_token: result.access_token, refresh_token: result.refresh_token });
        setBusiness(result.business);
      }

      updateData({ businessProfile: payload });
      onComplete();
    } catch (error) {
      setFormError(getErrorMessage(error, 'Unable to save your business profile. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2>Tell us about your business</h2>
      <p>This information helps customers recognize your store on WhatsApp.</p>
      {formError && <div className="form-banner form-banner-error">{formError}</div>}
      <form onSubmit={handleSubmit}>
        <Input
          label="Business name"
          id="businessName"
          name="businessName"
          value={form.businessName}
          onChange={handleChange}
          error={errors.businessName}
          required
        />
        <Select
          label="Business type"
          id="businessType"
          name="businessType"
          value={form.businessType}
          onChange={handleChange}
          error={errors.businessType}
          options={BUSINESS_TYPE_OPTIONS}
          placeholder="Select a type"
          required
        />
        <div className="form-row">
          <Input
            label="Business phone number"
            id="phoneNumber"
            name="phoneNumber"
            value={form.phoneNumber}
            onChange={handleChange}
            error={errors.phoneNumber}
            hint="e.g. +919876543210"
          />
          <Input
            label="WhatsApp number"
            id="whatsappNumber"
            name="whatsappNumber"
            value={form.whatsappNumber}
            onChange={handleChange}
            error={errors.whatsappNumber}
            hint="e.g. +919876543210"
          />
        </div>
        <Input
          label="Address"
          id="address"
          name="address"
          value={form.address}
          onChange={handleChange}
          error={errors.address}
        />
        <div className="form-row">
          <Input
            label="City"
            id="city"
            name="city"
            value={form.city}
            onChange={handleChange}
            error={errors.city}
          />
          <Input
            label="Postal code"
            id="postalCode"
            name="postalCode"
            value={form.postalCode}
            onChange={handleChange}
            error={errors.postalCode}
          />
        </div>
        <Input
          label="Website URL"
          id="websiteUrl"
          name="websiteUrl"
          value={form.websiteUrl}
          onChange={handleChange}
          error={errors.websiteUrl}
          hint="https://example.com"
        />
        <Button type="submit" block loading={loading}>Continue</Button>
      </form>
    </>
  );
};

BusinessProfileStep.propTypes = {
  onComplete: PropTypes.func.isRequired,
  updateData: PropTypes.func.isRequired,
};

export default BusinessProfileStep;
