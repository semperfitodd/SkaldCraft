import { useState, useEffect } from 'react';
import { Layout, Logo, Button, Loading } from '../../components';
import { buildLogoutUrl } from '../../utils/auth';
import { fetchStories, calculateAge } from '../../utils/api';
import './StoriesPage.css';

function StoriesPage({
  profile,
  activeProfile,
  onNavigateToHome,
  onNavigateToStory,
  onStartNewStory,
}) {
  const [stories, setStories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const isAdultProfile = activeProfile?.type === 'adult' && 
    profile?.profile?.birthday && 
    calculateAge(profile.profile.birthday) >= 18;

  useEffect(() => {
    if (!isAdultProfile) {
      setIsLoading(false);
      return;
    }
    
    const loadStories = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const profileId = profile?.email;
        const fetchedStories = await fetchStories(profileId);
        setStories(fetchedStories);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadStories();
  }, [isAdultProfile, profile?.email]);

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

  const header = (
    <>
      <Logo size="sm" />
      <div className="home-page__header-actions">
        <button className="home-page__profile-btn" onClick={onNavigateToHome}>
          Home
        </button>
        <Button as="a" href={buildLogoutUrl()} variant="ghost" size="sm">
          Sign Out
        </Button>
      </div>
    </>
  );

  if (!isAdultProfile) {
    return (
      <Layout header={header}>
        <div className="stories-page">
          <div className="stories-page__restricted">
            <div className="stories-page__restricted-icon">🔒</div>
            <p className="stories-page__restricted-text">
              Stories are currently available only for adult profiles.
              Please ensure you have an adult profile selected with a verified birthdate.
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
                onClick={() => onNavigateToStory(story.storyId)}
              >
                <div className="stories-page__item-content">
                  <h3 className="stories-page__item-title">{story.title}</h3>
                  <div className="stories-page__item-meta">
                    <span className={`stories-page__item-status stories-page__item-status--${story.status}`}>
                      {getStatusLabel(story.status)}
                    </span>
                    <span>{story.config?.genre}</span>
                    <span>Updated {formatDate(story.updatedAt)}</span>
                  </div>
                </div>
                <span className="stories-page__item-arrow">→</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default StoriesPage;


