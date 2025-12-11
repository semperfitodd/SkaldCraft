import { useState, useEffect, useRef } from 'react';
import { Layout, Logo, Button, ProfilesMenu } from '../../components';
import { buildLogoutUrl } from '../../utils/auth';
import { 
  fetchStory, 
  fetchStoryNode, 
  continueAdultStory,
  pollChapterReady,
  fetchStoryArchive,
  fetchStoryChapter
} from '../../utils/api';
import './StoryReaderPage.css';

const DESKTOP_BREAKPOINT = 1024;

function StoryReaderPage({
  profile,
  profiles,
  activeProfile,
  onSelectProfile,
  onProfilesChange,
  storyId,
  initialStory,
  initialNode,
  onNavigateToHome,
  onNavigateToProfile,
  onNavigateToStories,
  onStartNewStory,
}) {
  const [story, setStory] = useState(initialStory || null);
  const [currentNode, setCurrentNode] = useState(initialNode || null);
  const [archivedStory, setArchivedStory] = useState(null);
  const [selectedChapterIndex, setSelectedChapterIndex] = useState(0);
  const [viewingNode, setViewingNode] = useState(null);
  const [isLoading, setIsLoading] = useState(!initialStory);
  const [isLoadingChapter, setIsLoadingChapter] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > DESKTOP_BREAKPOINT);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > DESKTOP_BREAKPOINT);
  const contentRef = useRef(null);

  const isCompleted = story?.status === 'completed';
  const isArchived = story?.isArchived;

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth > DESKTOP_BREAKPOINT;
      setIsDesktop(desktop);
      // On desktop, default to open; on mobile, keep current state
      if (desktop && !sidebarOpen) {
        setSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  useEffect(() => {
    if (initialStory && initialNode) {
      setSelectedChapterIndex(initialNode.chapterIndex || 0);
      return;
    }

    const loadStory = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedStory = await fetchStory(storyId);
        setStory(fetchedStory);
        
        if (fetchedStory.status === 'completed' && fetchedStory.isArchived) {
          const archived = await fetchStoryArchive(storyId);
          setArchivedStory(archived);
          setSelectedChapterIndex(archived.chapters.length - 1);
        } else {
          const node = await fetchStoryNode(storyId, fetchedStory.activeNodeId);
          setCurrentNode(node);
          setSelectedChapterIndex(node.chapterIndex || 0);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadStory();
  }, [storyId, initialStory, initialNode]);

  const handleChoiceClick = async (choiceId) => {
    if (isContinuing || isCompleted) return;

    setIsContinuing(true);
    setError(null);

    try {
      const expectedChapterIndex = (currentNode?.chapterIndex || 0) + 1;
      await continueAdultStory(storyId, { choiceId });
      
      const result = await pollChapterReady(storyId, expectedChapterIndex);
      
      setStory(result.story);
      setCurrentNode(result.newNode);
      setViewingNode(null);
      setSelectedChapterIndex(result.newNode.chapterIndex || 0);
      
      if (contentRef.current) {
        contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsContinuing(false);
    }
  };

  const handleChapterSelect = async (chapterIndex) => {
    if (chapterIndex === selectedChapterIndex) return;
    
    setSelectedChapterIndex(chapterIndex);
    setError(null);
    
    // Close sidebar on mobile after selecting a chapter
    if (!isDesktop) {
      setSidebarOpen(false);
    }
    
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // For archived stories, content is already loaded
    if (isArchived && archivedStory) {
      setViewingNode(null);
      return;
    }

    // If selecting the current chapter, use currentNode
    if (chapterIndex === currentNode?.chapterIndex) {
      setViewingNode(null);
      return;
    }

    // Fetch the chapter from backend
    setIsLoadingChapter(true);
    try {
      const result = await fetchStoryChapter(storyId, chapterIndex);
      setViewingNode(result.node);
    } catch (err) {
      setError('Failed to load chapter');
    } finally {
      setIsLoadingChapter(false);
    }
  };

  const formatNodeText = (text) => {
    if (!text) return null;
    return text.split('\n\n').map((paragraph, index) => (
      <p key={index}>{paragraph}</p>
    ));
  };

  const getCurrentChapterText = () => {
    if (isArchived && archivedStory) {
      const chapter = archivedStory.chapters.find(ch => ch.chapterIndex === selectedChapterIndex);
      return chapter?.text || '';
    }
    // If viewing a previous chapter
    if (viewingNode && viewingNode.chapterIndex === selectedChapterIndex) {
      return viewingNode.text;
    }
    // If viewing the current chapter
    if (currentNode && currentNode.chapterIndex === selectedChapterIndex) {
      return currentNode.text;
    }
    return '';
  };

  const getCurrentChapterTitle = () => {
    if (!story?.outline || !story.outline[selectedChapterIndex]) {
      return `Chapter ${selectedChapterIndex + 1}`;
    }
    return story.outline[selectedChapterIndex].title;
  };

  const isCurrentChapter = () => {
    if (isArchived) return false;
    return currentNode?.chapterIndex === selectedChapterIndex;
  };

  const canShowChoices = () => {
    return isCurrentChapter() && !isCompleted && currentNode?.choices?.length > 0;
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
          onNavigateToSettings={onNavigateToProfile}
          onSignOut={() => window.location.href = buildLogoutUrl()}
        />
      </div>
    </>
  );

  if (isLoading) {
    return (
      <Layout header={header}>
        <div className="story-reader">
          <div className="story-reader__loading">
            <div className="story-reader__loading-spinner" />
            <div className="story-reader__loading-text">Loading your story...</div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!story) {
    return (
      <Layout header={header}>
        <div className="story-reader">
          <div className="story-reader__error">
            {error || 'Story not found'}
          </div>
          <Button onClick={onNavigateToStories}>Back to Stories</Button>
        </div>
      </Layout>
    );
  }

  const outline = story.outline || [];
  const isEnding = currentNode?.isEnding || (currentNode?.choices?.length === 0 && isCurrentChapter());

  return (
    <Layout header={header}>
      <div className="story-reader story-reader--two-pane">
        {sidebarOpen && !isDesktop && (
          <div 
            className="story-reader__sidebar-backdrop"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <button 
          className={`story-reader__sidebar-toggle ${sidebarOpen ? 'story-reader__sidebar-toggle--open' : ''}`}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title={sidebarOpen ? 'Hide chapters' : 'Show chapters'}
        >
          {sidebarOpen ? '✕' : '▶'}
        </button>

        <aside className={`story-reader__sidebar ${sidebarOpen ? 'story-reader__sidebar--open' : ''}`}>
          <div className="story-reader__sidebar-header">
            <h2 className="story-reader__sidebar-title">Chapters</h2>
            <div className="story-reader__sidebar-progress">
              {isCompleted ? 'Completed' : `${(currentNode?.chapterIndex || 0) + 1} of ${story.targetNodeCount || outline.length}`}
            </div>
          </div>
          
          <nav className="story-reader__chapter-list">
            {outline.map((chapter, index) => {
              const isAvailable = isArchived 
                ? archivedStory?.chapters.some(ch => ch.chapterIndex === index)
                : index <= (currentNode?.chapterIndex || 0);
              const isCurrent = index === selectedChapterIndex;
              const isActive = !isArchived && index === (currentNode?.chapterIndex || 0);
              
              return (
                <button
                  key={index}
                  className={`story-reader__chapter-item ${isCurrent ? 'story-reader__chapter-item--current' : ''} ${isActive ? 'story-reader__chapter-item--active' : ''} ${!isAvailable ? 'story-reader__chapter-item--locked' : ''}`}
                  onClick={() => isAvailable && handleChapterSelect(index)}
                  disabled={!isAvailable}
                >
                  <span className="story-reader__chapter-number">{index + 1}</span>
                  <span className="story-reader__chapter-title">{chapter.title.replace(/^Chapter \d+:\s*/, '')}</span>
                  {isActive && !isArchived && <span className="story-reader__chapter-badge">Current</span>}
                  {!isAvailable && <span className="story-reader__chapter-lock">🔒</span>}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="story-reader__main" ref={contentRef}>
          <div className="story-reader__main-inner">
            <div className="story-reader__header">
            <div className="story-reader__title-section">
              <h1 className="story-reader__title">{story.title}</h1>
              <div className="story-reader__meta">
                <span>{story.config?.genre}</span>
                <span>•</span>
                <span>{story.config?.tone}</span>
                {isCompleted && <span className="story-reader__status-badge">Completed</span>}
              </div>
            </div>
            <button className="story-reader__back-btn" onClick={onNavigateToStories}>
              ← Back to Stories
            </button>
          </div>

          {error && (
            <div className="story-reader__error">{error}</div>
          )}

          <div className="story-reader__content">
            <div className="story-reader__chapter-header">
              <h2 className="story-reader__chapter-heading">{getCurrentChapterTitle()}</h2>
            </div>

            <div className="story-reader__node">
              {isLoadingChapter ? (
                <div className="story-reader__loading-chapter">
                  <div className="story-reader__loading-spinner" />
                  <span>Loading chapter...</span>
                </div>
              ) : (
                <div className="story-reader__node-text">
                  {formatNodeText(getCurrentChapterText())}
                </div>
              )}
            </div>

            {!isCurrentChapter() && !isArchived && (
              <div className="story-reader__reading-past">
                <p>You are reading a previous chapter.</p>
                <Button 
                  variant="secondary" 
                  onClick={() => setSelectedChapterIndex(currentNode?.chapterIndex || 0)}
                >
                  Return to Current Chapter
                </Button>
              </div>
            )}

            {isEnding && isCurrentChapter() ? (
              <div className="story-reader__ending">
                <div className="story-reader__ending-icon">📖</div>
                <div className="story-reader__ending-text">The End</div>
                <div className="story-reader__ending-subtext">
                  Your story has reached its conclusion.
                </div>
                <div className="story-reader__ending-actions">
                  <Button variant="secondary" onClick={onNavigateToStories}>
                    Back to Stories
                  </Button>
                  <Button variant="primary" onClick={onStartNewStory}>
                    Start a New Story
                  </Button>
                </div>
              </div>
            ) : canShowChoices() ? (
              <div className="story-reader__choices">
                <div className="story-reader__choices-label">What happens next?</div>
                {currentNode.choices.map((choice) => (
                  <button
                    key={choice.choiceId}
                    className="story-reader__choice"
                    onClick={() => handleChoiceClick(choice.choiceId)}
                    disabled={isContinuing}
                  >
                    <span className="story-reader__choice-text">{choice.label}</span>
                    <span className="story-reader__choice-arrow">→</span>
                  </button>
                ))}
              </div>
            ) : isArchived && selectedChapterIndex === (archivedStory?.chapters?.length || 1) - 1 ? (
              <div className="story-reader__ending">
                <div className="story-reader__ending-icon">📖</div>
                <div className="story-reader__ending-text">The End</div>
                <div className="story-reader__ending-subtext">
                  This story has been completed. Use the chapter list to re-read any section.
                </div>
                <div className="story-reader__ending-actions">
                  <Button variant="secondary" onClick={onNavigateToStories}>
                    Back to Stories
                  </Button>
                  <Button variant="primary" onClick={onStartNewStory}>
                    Start a New Story
                  </Button>
                </div>
              </div>
            ) : null}

            {isContinuing && (
              <div className="story-reader__continuing">
                <div className="story-reader__continuing-spinner" />
                <span className="story-reader__continuing-text">
                  Writing the next chapter...
                </span>
              </div>
            )}
          </div>
          </div>
        </main>
      </div>
    </Layout>
  );
}

export default StoryReaderPage;
