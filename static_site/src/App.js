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

// Parse hash to get view and storyId
function parseHash() {
  const hash = window.location.hash.slice(1); // Remove leading #
  if (!hash || hash === '/') return { view: VIEW.HOME, storyId: null };
  
  const parts = hash.split('/').filter(Boolean);
  if (parts[0] === 'stories' && parts[1]) {
    return { view: VIEW.STORY_READER, storyId: parts[1] };
  }
  if (parts[0] === 'stories') {
    return { view: VIEW.STORIES, storyId: null };
  }
  if (parts[0] === 'profile') {
    return { view: VIEW.PROFILE, storyId: null };
  }
  if (parts[0] === 'onboarding') {
    return { view: VIEW.ONBOARDING, storyId: null };
  }
  return { view: VIEW.HOME, storyId: null };
}

// Update hash without triggering navigation
function updateHash(view, storyId = null) {
  let newHash = '#/';
  if (view === VIEW.STORIES) {
    newHash = '#/stories';
  } else if (view === VIEW.STORY_READER && storyId) {
    newHash = `#/stories/${storyId}`;
  } else if (view === VIEW.PROFILE) {
    newHash = '#/profile';
  } else if (view === VIEW.ONBOARDING) {
    newHash = '#/onboarding';
  }
  
  if (window.location.hash !== newHash) {
    window.location.hash = newHash;
  }
}

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

  // Load profile on authentication
  useEffect(() => {
    if (authenticated && !profile) {
      setProfileLoading(true);
      Promise.all([fetchProfile(), fetchProfiles()])
        .then(([profileData, profilesData]) => {
          setProfile(profileData);
          setProfiles(profilesData);
          
          // Check hash for initial view
          const { view, storyId } = parseHash();
          
          // If not onboarded, force onboarding view
          if (!profileData.onboardingComplete) {
            setCurrentView(VIEW.ONBOARDING);
            updateHash(VIEW.ONBOARDING);
          } else if (view === VIEW.STORY_READER && storyId) {
            // Restore story reader view from URL
            setCurrentView(VIEW.STORY_READER);
            setCurrentStoryId(storyId);
          } else if (view !== VIEW.ONBOARDING) {
            // Restore other views from URL
            setCurrentView(view);
          } else {
            // Default to home
            setCurrentView(VIEW.HOME);
            updateHash(VIEW.HOME);
          }
        })
        .catch((err) => setProfileError(err.message))
        .finally(() => setProfileLoading(false));
    }
  }, [authenticated, profile]);

  // Listen for hash changes (back/forward navigation)
  useEffect(() => {
    const handleHashChange = () => {
      if (!authenticated || !profile) return;
      
      const { view, storyId } = parseHash();
      
      // Don't allow navigating away from onboarding if not complete
      if (!profile.onboardingComplete && view !== VIEW.ONBOARDING) {
        updateHash(VIEW.ONBOARDING);
        return;
      }
      
      setCurrentView(view);
      if (view === VIEW.STORY_READER && storyId) {
        setCurrentStoryId(storyId);
        setCurrentStory(null);
        setCurrentNode(null);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [authenticated, profile]);

  const handleOnboardingComplete = (updatedProfile) => {
    setProfile(updatedProfile);
    setCurrentView(VIEW.HOME);
    updateHash(VIEW.HOME);
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
    updateHash(VIEW.STORIES);
  };

  const handleNavigateToStory = (storyId) => {
    setCurrentStoryId(storyId);
    setCurrentStory(null);
    setCurrentNode(null);
    setCurrentView(VIEW.STORY_READER);
    updateHash(VIEW.STORY_READER, storyId);
  };

  const handleStoryCreated = (result) => {
    setShowNewStoryModal(false);
    setCurrentStoryId(result.story.storyId);
    setCurrentStory(result.story);
    setCurrentNode(result.rootNode);
    setCurrentView(VIEW.STORY_READER);
    updateHash(VIEW.STORY_READER, result.story.storyId);
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
        onBack={() => {
          setCurrentView(VIEW.HOME);
          updateHash(VIEW.HOME);
        }}
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
      onNavigateToProfile={() => {
        setCurrentView(VIEW.PROFILE);
        updateHash(VIEW.PROFILE);
      }}
      onNavigateToStories={handleNavigateToStories}
    />
  );
}

export default App;
