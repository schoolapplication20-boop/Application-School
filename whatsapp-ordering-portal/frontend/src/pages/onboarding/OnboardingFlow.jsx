import { Fragment, useState } from 'react';
import BusinessProfileStep from './BusinessProfileStep';
import WhatsappSetupStep from './WhatsappSetupStep';

const STEPS = [
  { number: 1, label: 'Business profile' },
  { number: 2, label: 'WhatsApp setup' },
];

const OnboardingFlow = () => {
  const [step, setStep] = useState(1);

  return (
    <div className="onboarding-shell">
      <div className="card onboarding-card">
        <div className="auth-logo">WhatsApp Ordering Portal</div>
        <div className="onboarding-steps">
          {STEPS.map((item, index) => (
            <Fragment key={item.number}>
              <div
                className={`onboarding-step ${step === item.number ? 'active' : ''} ${step > item.number ? 'completed' : ''}`}
              >
                <span className="onboarding-step-number">{item.number}</span>
                <span>{item.label}</span>
              </div>
              {index < STEPS.length - 1 && <span className="onboarding-step-divider" />}
            </Fragment>
          ))}
        </div>

        {step === 1 && <BusinessProfileStep onComplete={() => setStep(2)} />}
        {step === 2 && <WhatsappSetupStep />}
      </div>
    </div>
  );
};

export default OnboardingFlow;
