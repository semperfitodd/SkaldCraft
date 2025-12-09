import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './hooks';
import { Loading } from './components';
import { LoginPage, HomePage, OnboardingPage, ProfilePage } from './pages';
import { fetchProfile, fetchProfiles } from './utils/api';

const VIEW = {
  HOME: 'home',
  ONBOARDING: 'onboarding',
  PROFILE: 'profile',
};

function App() {
  const { authenticated, loading: authLoading, error: authError } = useAuth();
  const [profile, setProfile] = useState(null);
  const [profiles, setProfiles] = useState(null); // { parent, children }
  const [activeProfile, setActiveProfile] = useState({ type: 'adult', profileId: null });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [currentView, setCurrentView] = useState(VIEW.HOME);

  const loadProfiles = useCallback(async () => {
    try {
      const profilesData = await fetchProfiles();
      setProfiles(profilesData);
    } catch (err) {
      console.error('Failed to load profiles:', err);
    }
  }, []);

  useEffect(() => {
    if (authenticated && !profile) {
      setProfileLoading(true);
      Promise.all([fetchProfile(), fetchProfiles()])
        .then(([profileData, profilesData]) => {
          setProfile(profileData);
          setProfiles(profilesData);
          setCurrentView(profileData.onboardingComplete ? VIEW.HOME : VIEW.ONBOARDING);
        })
        .catch((err) => setProfileError(err.message))
        .finally(() => setProfileLoading(false));
    }
  }, [authenticated, profile]);

  const handleOnboardingComplete = (updatedProfile) => {
    setProfile(updatedProfile);
    setCurrentView(VIEW.HOME);
  };

  const handleProfileUpdate = (updatedProfile) => {
    setProfile(updatedProfile);
  };

  const handleSelectProfile = (newActiveProfile) => {
    setActiveProfile(newActiveProfile);
  };

  const handleProfilesChange = async () => {
    await loadProfiles();
  };

  if (authLoading) return <Loading />;
  if (authError) return <Loading message={authError} />;
  if (!authenticated) return <LoginPage />;
  if (profileLoading) return <Loading message="Loading your profile..." />;
  if (profileError && !profile) return <Loading message={`Error: ${profileError}`} />;

  if (currentView === VIEW.ONBOARDING) {
    return <OnboardingPage profile={profile} onComplete={handleOnboardingComplete} />;
  }

  if (currentView === VIEW.PROFILE) {
    return (
      <ProfilePage
        profile={profile}
        onProfileUpdate={handleProfileUpdate}
        onBack={() => setCurrentView(VIEW.HOME)}
      />
    );
  }

  return (
    <HomePage 
      profile={profile}
      profiles={profiles}
      activeProfile={activeProfile}
      onSelectProfile={handleSelectProfile}
      onProfilesChange={handleProfilesChange}
      onNavigateToProfile={() => setCurrentView(VIEW.PROFILE)}
    />
  );
}

export default App;
