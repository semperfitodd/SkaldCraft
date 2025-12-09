import { useState } from 'react';
import { Layout, Logo } from '../../components';
import ProfileForm from '../../components/ProfileForm';
import { updateProfile } from '../../utils/api';
import './OnboardingPage.css';

function OnboardingPage({ profile, onComplete }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const updatedProfile = await updateProfile({
        ...formData,
        onboardingComplete: true,
      });
      onComplete(updatedProfile);
    } catch (err) {
      setError(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDisplayName = () => {
    if (profile?.givenName) return profile.givenName;
    if (profile?.email) return profile.email.split('@')[0];
    return 'there';
  };

  const header = (
    <>
      <Logo size="sm" />
      <span className="onboarding-page__header-text">Profile Setup</span>
    </>
  );

  return (
    <Layout header={header}>
      <div className="onboarding-page">
        <div className="onboarding-page__welcome">
          <h1 className="onboarding-page__title">Welcome, {getDisplayName()}!</h1>
          <p className="onboarding-page__subtitle">
            Let's personalize your reading experience. Tell us about your preferences
            so we can craft stories just for you.
          </p>
        </div>

        {error && <div className="onboarding-page__error">{error}</div>}

        <ProfileForm
          initialProfile={profile?.profile}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel="Complete Setup"
          showTitle={false}
        />
      </div>
    </Layout>
  );
}

export default OnboardingPage;
