import { Fragment, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import BusinessProfileStep from './BusinessProfileStep';
import WhatsappSetupStep from './WhatsappSetupStep';
import BusinessHoursStep from './BusinessHoursStep';
import DeliveryOptionsStep from './DeliveryOptionsStep';
import TaxesStep from './TaxesStep';
import PaymentsStep from './PaymentsStep';
import LogoStep from './LogoStep';
import ThemeStep from './ThemeStep';
import PublishStep from './PublishStep';
import api from '../../services/api';

const STEPS = [
  { number: 1, label: 'Business', icon: '🏪' },
  { number: 2, label: 'Hours',    icon: '🕐' },
  { number: 3, label: 'WhatsApp', icon: '💬' },
  { number: 4, label: 'Delivery', icon: '🚚' },
  { number: 5, label: 'Taxes',    icon: '🧾' },
  { number: 6, label: 'Payments', icon: '💳' },
  { number: 7, label: 'Logo',     icon: '🎨' },
  { number: 8, label: 'Theme',    icon: '✨' },
  { number: 9, label: 'Publish',  icon: '🚀' },
];

const OnboardingFlow = () => {
  const [step, setStep]         = useState(1);
  const [saving, setSaving]     = useState(false);
  const [formData, setFormData] = useState({});
  const navigate = useNavigate();

  const next = useCallback(() => setStep((s) => Math.min(s + 1, STEPS.length)), []);
  const back = useCallback(() => setStep((s) => Math.max(s - 1, 1)), []);

  const updateData = useCallback((patch) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  }, []);

  const handlePublish = async () => {
    setSaving(true);
    try {
      await api.patch('/businesses/onboarding-complete', { onboardingCompleted: true });
      navigate('/dashboard');
    } catch {
      // still navigate — business data already saved per step
      navigate('/dashboard');
    } finally {
      setSaving(false);
    }
  };

  const percent = Math.round(((step - 1) / (STEPS.length - 1)) * 100);

  return (
    <div className="onboarding-shell">
      <div className="onboarding-card-wide">
        {/* Header */}
        <div className="onboarding-header">
          <div className="onboarding-logo">💬 OrderBot</div>
          <div className="onboarding-progress-label">Step {step} of {STEPS.length}</div>
        </div>

        {/* Progress bar */}
        <div className="onboarding-progress-bar">
          <div className="onboarding-progress-fill" style={{ width: `${percent}%` }} />
        </div>

        {/* Step pills */}
        <div className="onboarding-steps">
          {STEPS.map((item, index) => (
            <Fragment key={item.number}>
              <div className={`onboarding-step-pill ${step === item.number ? 'active' : ''} ${step > item.number ? 'completed' : ''}`}>
                <span className="onboarding-pill-icon">
                  {step > item.number ? '✓' : item.icon}
                </span>
                <span className="onboarding-pill-label">{item.label}</span>
              </div>
              {index < STEPS.length - 1 && <div className="onboarding-step-connector" />}
            </Fragment>
          ))}
        </div>

        {/* Step content */}
        <div className="onboarding-content">
          {step === 1 && <BusinessProfileStep data={formData} updateData={updateData} onComplete={next} />}
          {step === 2 && <BusinessHoursStep   data={formData} updateData={updateData} onNext={next} onBack={back} />}
          {step === 3 && <WhatsappSetupStep   data={formData} updateData={updateData} onNext={next} onBack={back} />}
          {step === 4 && <DeliveryOptionsStep data={formData} updateData={updateData} onNext={next} onBack={back} />}
          {step === 5 && <TaxesStep           data={formData} updateData={updateData} onNext={next} onBack={back} />}
          {step === 6 && <PaymentsStep        data={formData} updateData={updateData} onNext={next} onBack={back} />}
          {step === 7 && <LogoStep            data={formData} updateData={updateData} onNext={next} onBack={back} />}
          {step === 8 && <ThemeStep           data={formData} updateData={updateData} onNext={next} onBack={back} />}
          {step === 9 && <PublishStep         data={formData} saving={saving} onPublish={handlePublish} onBack={back} />}
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;
