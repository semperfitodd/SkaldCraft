import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './hooks';
import { Loading, NewStoryModal } from './components';
import { LoginPage, HomePage, OnboardingPage, ProfilePage, StoriesPage, StoryReaderPage } from './pages';
import { fetchProfile, fetchProfiles } from './utils/api';

const VIEW = {
  HOME: 'home',
  ONBOARDING: 'onboarding',
  PROFILE: 'profile',
  STORIES: 'stories',
  STORY_READER: 'story_reader',
};

function App() {
  const { authenticated, loading: authLoading, error: authError } = useAuth();
  const [profile, setProfile] = useState(null);
  const [profiles, setProfiles] = useState(null);
  const [activeProfile, setActiveProfile] = useState({ type: 'adult', profileId: null });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [currentView, setCurrentView] = useState(VIEW.HOME);
  const [showNewStoryModal, setShowNewStoryModal] = useState(false);
  const [currentStoryId, setCurrentStoryId] = useState(null);
  const [currentStory, setCurrentStory] = useState(null);
  const [currentNode, setCurrentNode] = useState(null);

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

  const handleNavigateToStories = () => {
    setCurrentView(VIEW.STORIES);
    setCurrentStoryId(null);
    setCurrentStory(null);
    setCurrentNode(null);
  };

  const handleNavigateToStory = (storyId) => {
    setCurrentStoryId(storyId);
    setCurrentStory(null);
    setCurrentNode(null);
    setCurrentView(VIEW.STORY_READER);
  };

  const handleStoryCreated = (result) => {
    setShowNewStoryModal(false);
    setCurrentStoryId(result.story.storyId);
    setCurrentStory(result.story);
    setCurrentNode(result.rootNode);
    setCurrentView(VIEW.STORY_READER);
  };

  const handleStartNewStory = () => {
    setShowNewStoryModal(true);
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

  if (currentView === VIEW.STORIES) {
    return (
      <>
        <StoriesPage
          profile={profile}
          activeProfile={activeProfile}
          onNavigateToHome={() => setCurrentView(VIEW.HOME)}
          onNavigateToStory={handleNavigateToStory}
          onStartNewStory={handleStartNewStory}
        />
        {showNewStoryModal && (
          <NewStoryModal
            profileId={profile?.email}
            preferredGenres={profile?.profile?.preferredGenres}
            onClose={() => setShowNewStoryModal(false)}
            onStoryCreated={handleStoryCreated}
          />
        )}
      </>
    );
  }

  if (currentView === VIEW.STORY_READER && currentStoryId) {
    return (
      <>
        <StoryReaderPage
          storyId={currentStoryId}
          initialStory={currentStory}
          initialNode={currentNode}
          onNavigateToStories={handleNavigateToStories}
          onStartNewStory={handleStartNewStory}
        />
        {showNewStoryModal && (
          <NewStoryModal
            profileId={profile?.email}
            preferredGenres={profile?.profile?.preferredGenres}
            onClose={() => setShowNewStoryModal(false)}
            onStoryCreated={handleStoryCreated}
          />
        )}
      </>
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
      onNavigateToStories={handleNavigateToStories}
    />
  );
}

export default App;
