import { useState, useMemo } from 'react';
import { Button } from '../../components';
import { createChildStory, pollStoryReady, PROFILE_OPTIONS, READING_PURPOSES, calculateAge } from '../../utils/api';
import './ChildStoryModal.css';

const MAX_CUSTOM_PROMPT_LENGTH = 300;

const GENRE_DESCRIPTIONS = {
  'adventure': 'Exciting quests and exploration',
  'animals': 'Stories about animals and nature',
  'sports': 'Athletic adventures and teamwork',
  'school-life': 'School friends and learning',
  'history': 'Stories from the past',
  'science-space': 'Science and space exploration',
  'funny': 'Silly and humorous tales',
  'mystery': 'Puzzles and clues to solve',
  'fairy-tales': 'Magical fairy tale worlds',
  'comic-style': 'Action-packed comic adventures',
};

const DEFAULT_PRESETS = [
  { id: 'adventure', name: 'Adventure', genre: 'adventure', desc: 'Exciting quests and exploration' },
  { id: 'animals', name: 'Animals', genre: 'animals', desc: 'Stories about animals and nature' },
  { id: 'funny', name: 'Funny', genre: 'funny', desc: 'Silly and humorous tales' },
  { id: 'mystery', name: 'Mystery', genre: 'mystery', desc: 'Puzzles and clues to solve' },
  { id: 'fairy-tales', name: 'Fairy Tales', genre: 'fairy-tales', desc: 'Magical fairy tale worlds' },
];

const LENGTH_OPTIONS = [
  { value: 'short', name: 'Short', desc: '3-5 chapters' },
  { value: 'medium', name: 'Medium', desc: '8-12 chapters' },
  { value: 'long', name: 'Long', desc: '15-20 chapters' },
];

function ChildStoryModal({ childProfile, preferredGenres = [], onClose, onStoryCreated }) {
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [readingPurpose, setReadingPurpose] = useState('fun');
  const [targetLength, setTargetLength] = useState('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState(null);

  // Build genre options from child's preferred genres or fallback to defaults
  const genreOptions = useMemo(() => {
    if (preferredGenres && preferredGenres.length > 0) {
      const options = preferredGenres.map(genreId => {
        const genreInfo = PROFILE_OPTIONS.childGenres.find(g => g.value === genreId);
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
      
      const age = calculateAge(childProfile.birthday);
      
      const payload = {
        profileId: childProfile.profileId,
        readingLevel: childProfile.readingLevelGRL,
        readingAgeBand: childProfile.readingAgeBand,
        readingPurpose,
        targetLength,
        age: age,
      };

      if (isCustom) {
        payload.customPrompt = customPrompt.trim();
      } else {
        payload.genre = preset.genre;
      }

      setStatusMessage('Creating your story...');
      const initResult = await createChildStory(payload);
      
      setStatusMessage('Writing the first chapter...');
      const result = await pollStoryReady(initResult.story.storyId);
      
      onStoryCreated({ story: result.story, rootNode: result.currentNode });
    } catch (err) {
      setError(err.message || 'Failed to create story');
      setStatusMessage('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="child-story-modal">
      <div className="child-story-modal__backdrop" onClick={onClose} />
      <div className="child-story-modal__content">
        <div className="child-story-modal__header">
          <h2 className="child-story-modal__title">Start a New Story</h2>
          <button className="child-story-modal__close" onClick={onClose}>×</button>
        </div>

        <div className="child-story-modal__body">
          {error && <div className="child-story-modal__error">{error}</div>}

          <div className="child-story-modal__section">
            <label className="child-story-modal__label">What kind of story?</label>
            <div className="child-story-modal__story-types">
              {genreOptions.map((preset) => (
                <button
                  key={preset.id}
                  className={`child-story-modal__story-type ${selectedPreset === preset.id ? 'child-story-modal__story-type--selected' : ''}`}
                  onClick={() => setSelectedPreset(preset.id)}
                  type="button"
                >
                  <div className="child-story-modal__story-type-name">{preset.name}</div>
                  <div className="child-story-modal__story-type-desc">{preset.desc}</div>
                </button>
              ))}
            </div>

            {isCustom && (
              <textarea
                className="child-story-modal__custom-prompt"
                placeholder="Tell us what kind of story you'd like to read... (e.g., 'A story about a brave puppy who goes on an adventure')"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                maxLength={MAX_CUSTOM_PROMPT_LENGTH}
              />
            )}
          </div>

          <div className="child-story-modal__section">
            <label className="child-story-modal__label">What's this story for?</label>
            <div className="child-story-modal__purposes">
              {READING_PURPOSES.map((purpose) => (
                <button
                  key={purpose.value}
                  className={`child-story-modal__purpose ${readingPurpose === purpose.value ? 'child-story-modal__purpose--selected' : ''}`}
                  onClick={() => setReadingPurpose(purpose.value)}
                  type="button"
                >
                  <div className="child-story-modal__purpose-name">{purpose.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="child-story-modal__section">
            <label className="child-story-modal__label">Story Length</label>
            <div className="child-story-modal__lengths">
              {LENGTH_OPTIONS.map((len) => (
                <button
                  key={len.value}
                  className={`child-story-modal__length ${targetLength === len.value ? 'child-story-modal__length--selected' : ''}`}
                  onClick={() => setTargetLength(len.value)}
                  type="button"
                >
                  <div className="child-story-modal__length-name">{len.name}</div>
                  <div className="child-story-modal__length-desc">{len.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="child-story-modal__info">
            <p className="child-story-modal__info-text">
              📚 Reading Level: <strong>{childProfile.readingLevelGRL}</strong>
            </p>
          </div>
        </div>

        <div className="child-story-modal__footer">
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

export default ChildStoryModal;

