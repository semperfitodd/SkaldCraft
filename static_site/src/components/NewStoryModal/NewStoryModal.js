import { useState, useMemo } from 'react';
import { Button } from '../../components';
import { createAdultStory, pollStoryReady, STORY_OPTIONS, PROFILE_OPTIONS } from '../../utils/api';
import './NewStoryModal.css';

const GENRE_DESCRIPTIONS = {
  'fantasy': 'Magic, dragons, and adventure',
  'mystery': 'Puzzles and intrigue',
  'sci-fi': 'Future tech and space',
  'romance': 'Love and relationships',
  'thriller': 'Suspense and tension',
  'horror': 'Fear and the unknown',
  'historical': 'Stories from the past',
  'literary': 'Character-driven narratives',
  'adventure': 'Action and exploration',
  'humor': 'Comedy and laughs',
  'drama': 'Emotional depth',
  'western': 'The wild frontier',
  'paranormal': 'Ghosts and the supernatural',
  'dystopian': 'Dark futures',
  'mythology': 'Gods and legends',
  'fairy-tale': 'Classic tales reimagined',
  'steampunk': 'Victorian sci-fi',
  'noir': 'Dark detective stories',
};

const DEFAULT_PRESETS = [
  { id: 'fantasy', name: 'Fantasy', genre: 'fantasy', desc: 'Magic, dragons, and adventure' },
  { id: 'mystery', name: 'Mystery', genre: 'mystery', desc: 'Puzzles and intrigue' },
  { id: 'sci-fi', name: 'Sci-Fi', genre: 'sci-fi', desc: 'Future tech and space' },
  { id: 'romance', name: 'Romance', genre: 'romance', desc: 'Love and relationships' },
  { id: 'thriller', name: 'Thriller', genre: 'thriller', desc: 'Suspense and tension' },
];

const LENGTH_OPTIONS = [
  { value: 'short', name: 'Short', desc: '~5 sections' },
  { value: 'medium', name: 'Medium', desc: '~10 sections' },
  { value: 'long', name: 'Long', desc: '~20 sections' },
];

function NewStoryModal({ profileId, preferredGenres = [], onClose, onStoryCreated }) {
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [tone, setTone] = useState('light');
  const [pov, setPov] = useState('third-person-limited');
  const [targetLength, setTargetLength] = useState('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState(null);

  // Build genre options from user's preferred genres or fallback to defaults
  const genreOptions = useMemo(() => {
    if (preferredGenres && preferredGenres.length > 0) {
      const options = preferredGenres.map(genreId => {
        const genreInfo = PROFILE_OPTIONS.genres.find(g => g.value === genreId);
        return {
          id: genreId,
          name: genreInfo?.label || genreId,
          genre: genreId,
          desc: GENRE_DESCRIPTIONS[genreId] || 'An exciting story',
        };
      });
      options.push({ id: 'other', name: 'Something Else', genre: null, desc: 'Describe your own idea' });
      return options;
    }
    return [...DEFAULT_PRESETS, { id: 'other', name: 'Something Else', genre: null, desc: 'Describe your own idea' }];
  }, [preferredGenres]);

  const isCustom = selectedPreset === 'other';
  const canSubmit = selectedPreset && (!isCustom || customPrompt.trim().length > 0);

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const preset = genreOptions.find(p => p.id === selectedPreset);
      
      const payload = {
        profileId,
        targetLength,
        pov,
        tone,
      };

      if (isCustom) {
        payload.customPrompt = customPrompt.trim();
      } else {
        payload.genre = preset.genre;
      }

      setStatusMessage('Initializing your story...');
      const initResult = await createAdultStory(payload);
      
      setStatusMessage('Generating outline and first chapter...');
      const result = await pollStoryReady(initResult.story.storyId);
      
      console.log('[NewStoryModal] Story ready, calling onStoryCreated:', result);
      onStoryCreated({ story: result.story, rootNode: result.currentNode });
    } catch (err) {
      console.error('[NewStoryModal] Error creating story:', err);
      setError(err.message || 'Failed to create story');
      setStatusMessage('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="new-story-modal">
      <div className="new-story-modal__backdrop" onClick={onClose} />
      <div className="new-story-modal__content">
        <div className="new-story-modal__header">
          <h2 className="new-story-modal__title">Start a New Story</h2>
          <button className="new-story-modal__close" onClick={onClose}>×</button>
        </div>

        <div className="new-story-modal__body">
          {error && <div className="new-story-modal__error">{error}</div>}

          <div className="new-story-modal__section">
            <label className="new-story-modal__label">What kind of story?</label>
            <div className="new-story-modal__story-types">
              {genreOptions.map((preset) => (
                <button
                  key={preset.id}
                  className={`new-story-modal__story-type ${selectedPreset === preset.id ? 'new-story-modal__story-type--selected' : ''}`}
                  onClick={() => setSelectedPreset(preset.id)}
                  type="button"
                >
                  <div className="new-story-modal__story-type-name">{preset.name}</div>
                  <div className="new-story-modal__story-type-desc">{preset.desc}</div>
                </button>
              ))}
            </div>

            {isCustom && (
              <textarea
                className="new-story-modal__custom-prompt"
                placeholder="Describe the kind of story you'd like to read... (e.g., 'A noir detective story set in 1920s Chicago with supernatural elements')"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                maxLength={500}
              />
            )}
          </div>

          <div className="new-story-modal__section">
            <label className="new-story-modal__label">Story Options</label>
            <div className="new-story-modal__options-row">
              <div className="new-story-modal__option-group">
                <span className="new-story-modal__option-label">Tone</span>
                <select
                  className="new-story-modal__select"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                >
                  {STORY_OPTIONS.tones.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="new-story-modal__option-group">
                <span className="new-story-modal__option-label">Point of View</span>
                <select
                  className="new-story-modal__select"
                  value={pov}
                  onChange={(e) => setPov(e.target.value)}
                >
                  {STORY_OPTIONS.povs.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="new-story-modal__section">
            <label className="new-story-modal__label">Story Length</label>
            <div className="new-story-modal__lengths">
              {LENGTH_OPTIONS.map((len) => (
                <button
                  key={len.value}
                  className={`new-story-modal__length ${targetLength === len.value ? 'new-story-modal__length--selected' : ''}`}
                  onClick={() => setTargetLength(len.value)}
                  type="button"
                >
                  <div className="new-story-modal__length-name">{len.name}</div>
                  <div className="new-story-modal__length-desc">{len.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="new-story-modal__footer">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? (statusMessage || 'Creating...') : 'Start Story'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default NewStoryModal;
