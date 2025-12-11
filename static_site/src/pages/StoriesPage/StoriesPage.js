import { useState, useEffect } from 'react';
import { Layout, Logo, Button, Loading, ProfilesMenu } from '../../components';
import { buildLogoutUrl } from '../../utils/auth';
import { fetchStories, deleteStory, calculateAge, isChildProfile, getProfileIdForStory } from '../../utils/api';
import './StoriesPage.css';

function StoriesPage({
  profile,
  profiles,
  activeProfile,
  onSelectProfile,
  onProfilesChange,
  onNavigateToHome,
  onNavigateToProfile,
  onNavigateToStory,
  onStartNewStory,
}) {
  const [stories, setStories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingStoryId, setDeletingStoryId] = useState(null);

  const isChild = isChildProfile(activeProfile);
  const canViewStories = isChild || (activeProfile?.type === 'adult' && 
    profile?.profile?.birthday && 
    calculateAge(profile.profile.birthday) >= 18);

  useEffect(() => {
    if (!canViewStories) {
      setIsLoading(false);
      return;
    }
    
    const loadStories = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const profileId = getProfileIdForStory(activeProfile, profile?.email);
        const fetchedStories = await fetchStories(profileId);
        setStories(fetchedStories);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadStories();
  }, [canViewStories, activeProfile, profile?.email, profiles]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'abandoned': return 'Abandoned';
      default: return status;
    }
  };

  const handleDeleteStory = async (storyId, storyTitle, event) => {
    event.stopPropagation(); // Prevent navigating to story
    
    if (!window.confirm(`Are you sure you want to delete "${storyTitle}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingStoryId(storyId);
    setError(null);

    try {
      await deleteStory(storyId);
      // Remove from local state
      setStories(stories.filter(s => s.storyId !== storyId));
    } catch (err) {
      setError(`Failed to delete story: ${err.message}`);
    } finally {
      setDeletingStoryId(null);
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
          onAddProfile={() => {}}
          onEditProfile={() => {}}
          onNavigateToHome={onNavigateToHome}
          onNavigateToStories={null}
          onNavigateToSettings={onNavigateToProfile}
          onSignOut={() => window.location.href = buildLogoutUrl()}
        />
      </div>
    </>
  );

  if (!canViewStories) {
    return (
      <Layout header={header}>
        <div className="stories-page">
          <div className="stories-page__restricted">
            <div className="stories-page__restricted-icon">🔒</div>
            <p className="stories-page__restricted-text">
              Stories are available for adult profiles (18+) and child profiles.
              Please ensure you have selected a valid profile with a verified birthdate.
            </p>
            <Button onClick={onNavigateToHome} variant="secondary" style={{ marginTop: '1rem' }}>
              Back to Home
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout header={header}>
        <div className="stories-page">
          <div className="stories-page__loading">
            <Loading message="Loading your stories..." />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout header={header}>
      <div className="stories-page">
        <div className="stories-page__header">
          <h1 className="stories-page__title">Your Stories</h1>
          <Button onClick={onStartNewStory} variant="primary">
            Start New Story
          </Button>
        </div>

        {error && (
          <div className="stories-page__error">{error}</div>
        )}

        {stories.length === 0 ? (
          <div className="stories-page__empty">
            <div className="stories-page__empty-icon">📚</div>
            <p className="stories-page__empty-text">
              You haven't started any stories yet.
              Create your first interactive story!
            </p>
            <Button onClick={onStartNewStory} variant="primary">
              Start Your First Story
            </Button>
          </div>
        ) : (
          <div className="stories-page__list">
            {stories.map((story) => (
              <div
                key={story.storyId}
                className="stories-page__item"
              >
                <div 
                  className="stories-page__item-content"
                  onClick={() => onNavigateToStory(story.storyId)}
                >
                  <h3 className="stories-page__item-title">{story.title}</h3>
                  <div className="stories-page__item-meta">
                    <span className={`stories-page__item-status stories-page__item-status--${story.status}`}>
                      {getStatusLabel(story.status)}
                    </span>
                    <span>{story.config?.genre}</span>
                    <span>Updated {formatDate(story.updatedAt)}</span>
                  </div>
                </div>
                <div className="stories-page__item-actions">
                  <button
                    className="stories-page__delete-btn"
                    onClick={(e) => handleDeleteStory(story.storyId, story.title, e)}
                    disabled={deletingStoryId === story.storyId}
                    title="Delete story"
                  >
                    {deletingStoryId === story.storyId ? '⏳' : '🗑️'}
                  </button>
                  <span 
                    className="stories-page__item-arrow"
                    onClick={() => onNavigateToStory(story.storyId)}
                  >
                    →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default StoriesPage;
