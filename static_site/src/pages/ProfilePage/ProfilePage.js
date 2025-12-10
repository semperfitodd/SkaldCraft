import { useState } from 'react';
import { Layout, Logo, ProfilesMenu } from '../../components';
import ProfileForm from '../../components/ProfileForm';
import { updateProfile } from '../../utils/api';
import { buildLogoutUrl } from '../../utils/auth';
import './ProfilePage.css';

const SUCCESS_MESSAGE_DURATION = 3000;

function ProfilePage({ profile, profiles, activeProfile, onSelectProfile, onProfilesChange, onProfileUpdate, onNavigateToHome, onNavigateToStories, onBack }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const updatedProfile = await updateProfile(formData);
      onProfileUpdate(updatedProfile);
      setSuccess(true);
      setTimeout(() => setSuccess(false), SUCCESS_MESSAGE_DURATION);
    } catch (err) {
      setError(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDisplayName = () => {
    if (profile?.givenName && profile?.familyName) {
      return `${profile.givenName} ${profile.familyName}`;
    }
    if (profile?.givenName) return profile.givenName;
    if (profile?.email) return profile.email;
    return 'User';
  };

  const header = (
    <>
      <Logo size="sm" />
      <div className="home-page__header-actions">
        <ProfilesMenu
          profiles={profiles}
          activeProfile={activeProfile}
          onSelectProfile={onSelectProfile}
          onAddProfile={() => {}}
          onEditProfile={() => {}}
          onNavigateToHome={onNavigateToHome}
          onNavigateToStories={onNavigateToStories}
          onNavigateToSettings={null}
          onSignOut={() => window.location.href = buildLogoutUrl()}
        />
      </div>
    </>
  );

  return (
    <Layout header={header}>
      <div className="profile-page">
        <div className="profile-page__header">
          <h1 className="profile-page__title">Profile Settings</h1>
          <p className="profile-page__user">{getDisplayName()}</p>
          {profile?.email && <p className="profile-page__email">{profile.email}</p>}
        </div>

        {error && <div className="profile-page__error">{error}</div>}
        {success && <div className="profile-page__success">Profile updated successfully!</div>}

        <ProfileForm
          initialProfile={profile?.profile}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel="Save Changes"
          title="Reading Preferences"
        />
      </div>
    </Layout>
  );
}

export default ProfilePage;
