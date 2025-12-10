import { useState } from 'react';
import { Layout, Logo, Button, ProfilesMenu, ChildProfileForm } from '../../components';
import { buildLogoutUrl } from '../../utils/auth';
import { createChildProfile, updateChildProfile, deleteChildProfile } from '../../utils/api';
import './HomePage.css';

function HomePage({ 
  profile, 
  profiles, 
  activeProfile, 
  onSelectProfile, 
  onProfilesChange,
  onNavigateToProfile,
  onNavigateToStories,
}) {
  const [showAddChild, setShowAddChild] = useState(false);
  const [editingChild, setEditingChild] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const getDisplayName = () => {
    if (activeProfile?.type === 'child' && profiles?.children) {
      const child = profiles.children.find(c => c.profileId === activeProfile.profileId);
      if (child) return child.displayName;
    }
    if (!profile) return 'there';
    if (profile.givenName && profile.familyName) {
      return `${profile.givenName} ${profile.familyName}`;
    }
    if (profile.givenName) return profile.givenName;
    if (profile.email) return profile.email.split('@')[0];
    return 'there';
  };

  const handleAddChild = async (formData) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await createChildProfile(formData);
      await onProfilesChange();
      setShowAddChild(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditChild = async (formData) => {
    if (!editingChild) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await updateChildProfile(editingChild.profileId, formData);
      await onProfilesChange();
      setEditingChild(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteChild = async (profileId) => {
    if (!window.confirm('Are you sure you want to delete this child profile? This cannot be undone.')) return;
    try {
      await deleteChildProfile(profileId);
      if (activeProfile?.profileId === profileId) {
        onSelectProfile({ type: 'adult', profileId: null });
      }
      await onProfilesChange();
      setEditingChild(null);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const header = (
    <>
      <Logo size="sm" />
      <div className="home-page__header-actions">
        <ProfilesMenu
          profiles={profiles}
          activeProfile={activeProfile}
          onSelectProfile={onSelectProfile}
          onAddProfile={() => setShowAddChild(true)}
          onEditProfile={(child) => setEditingChild(child)}
        />
        <button 
          className="home-page__profile-btn"
          onClick={onNavigateToStories}
        >
          Stories
        </button>
        <button 
          className="home-page__profile-btn"
          onClick={onNavigateToProfile}
        >
          Settings
        </button>
        <Button as="a" href={buildLogoutUrl()} variant="ghost" size="sm">
          Sign Out
        </Button>
      </div>
    </>
  );

  if (showAddChild) {
    return (
      <Layout header={header}>
        <div className="home-page home-page--form">
          {error && <div className="home-page__error">{error}</div>}
          <ChildProfileForm
            onSubmit={handleAddChild}
            onCancel={() => {
              setShowAddChild(false);
              setError(null);
            }}
            isSubmitting={isSubmitting}
          />
        </div>
      </Layout>
    );
  }

  if (editingChild) {
    return (
      <Layout header={header}>
        <div className="home-page home-page--form">
          {error && <div className="home-page__error">{error}</div>}
          <ChildProfileForm
            initialProfile={editingChild}
            onSubmit={handleEditChild}
            onCancel={() => {
              setEditingChild(null);
              setError(null);
            }}
            isSubmitting={isSubmitting}
            isEditing
          />
          <button
            className="home-page__delete-btn"
            onClick={() => handleDeleteChild(editingChild.profileId)}
          >
            Delete This Profile
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout header={header}>
      <div className="home-page">
        <h1 className="home-page__greeting">
          Hello, {getDisplayName()}!
        </h1>
        <p className="home-page__message">Welcome to SkaldCraft</p>
        {activeProfile?.type === 'child' && (
          <p className="home-page__reading-as">
            Reading as: <strong>{getDisplayName()}</strong>
          </p>
        )}
      </div>
    </Layout>
  );
}

export default HomePage;
