import { useState, useEffect } from 'react';
import { 
  PROFILE_OPTIONS, 
  calculateAge, 
  isExplicitContentDisabled,
  EXPLICIT_CONTENT_DISABLED_MESSAGE 
} from '../../utils/api';
import './ChildProfileForm.css';

function ChildProfileForm({ 
  initialProfile = null,
  onSubmit, 
  onCancel,
  isSubmitting = false,
  isEditing = false
}) {
  const [formData, setFormData] = useState({
    displayName: '',
    birthday: '',
    readingLevelGRL: 'M',
    readingAgeBand: 'upper-elementary',
    preferredGenres: ['adventure'],
    defaultLanguage: 'en',
    explicitContentAllowed: false,
  });

  useEffect(() => {
    if (initialProfile) {
      setFormData({
        displayName: initialProfile.displayName || '',
        birthday: initialProfile.birthday || '',
        readingLevelGRL: initialProfile.readingLevelGRL || 'M',
        readingAgeBand: initialProfile.readingAgeBand || 'upper-elementary',
        preferredGenres: initialProfile.preferredGenres || ['adventure'],
        defaultLanguage: initialProfile.defaultLanguage || 'en',
        explicitContentAllowed: initialProfile.explicitContentAllowed || false,
      });
    }
  }, [initialProfile]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleGenreToggle = (genre) => {
    setFormData(prev => {
      const currentGenres = prev.preferredGenres;
      if (currentGenres.includes(genre)) {
        if (currentGenres.length === 1) return prev;
        return { ...prev, preferredGenres: currentGenres.filter(g => g !== genre) };
      }
      return { ...prev, preferredGenres: [...currentGenres, genre] };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const age = calculateAge(formData.birthday);
  const explicitDisabled = isExplicitContentDisabled(formData.birthday);

  return (
    <form className="child-profile-form" onSubmit={handleSubmit}>
      <h2 className="child-profile-form__title">
        {isEditing ? 'Edit Child Profile' : 'Add Child Profile'}
      </h2>

      <div className="child-profile-form__section">
        <label className="child-profile-form__label">Display Name</label>
        <p className="child-profile-form__hint">What should we call this reader?</p>
        <input
          type="text"
          name="displayName"
          value={formData.displayName}
          onChange={handleChange}
          className="child-profile-form__input"
          placeholder="e.g., Kai, Malia"
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="child-profile-form__section">
        <label className="child-profile-form__label">Birthday</label>
        <p className="child-profile-form__hint">
          When were they born?
          {age !== null && <span className="child-profile-form__age"> (Age: {age})</span>}
        </p>
        <input
          type="date"
          name="birthday"
          value={formData.birthday}
          onChange={handleChange}
          className="child-profile-form__input"
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="child-profile-form__section">
        <label className="child-profile-form__label">Guided Reading Level (GRL)</label>
        <p className="child-profile-form__hint">Select their current reading level (A-Z)</p>
        <select
          name="readingLevelGRL"
          value={formData.readingLevelGRL}
          onChange={handleChange}
          className="child-profile-form__select"
          disabled={isSubmitting}
        >
          {PROFILE_OPTIONS.readingLevels.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="child-profile-form__section">
        <label className="child-profile-form__label">Reading Age Band</label>
        <p className="child-profile-form__hint">What age group fits their reading interests?</p>
        <select
          name="readingAgeBand"
          value={formData.readingAgeBand}
          onChange={handleChange}
          className="child-profile-form__select"
          disabled={isSubmitting}
        >
          {PROFILE_OPTIONS.readingAgeBands.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="child-profile-form__section">
        <label className="child-profile-form__label">Favorite Genres</label>
        <p className="child-profile-form__hint">Select all genres they enjoy (at least one)</p>
        <div className="child-profile-form__genres">
          {PROFILE_OPTIONS.childGenres.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`child-profile-form__genre-btn ${
                formData.preferredGenres.includes(opt.value) ? 'child-profile-form__genre-btn--active' : ''
              }`}
              onClick={() => handleGenreToggle(opt.value)}
              disabled={isSubmitting}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="child-profile-form__section">
        <label className="child-profile-form__label">Default Language</label>
        <p className="child-profile-form__hint">Preferred language for stories</p>
        <select
          name="defaultLanguage"
          value={formData.defaultLanguage}
          onChange={handleChange}
          className="child-profile-form__select"
          disabled={isSubmitting}
        >
          {PROFILE_OPTIONS.languages.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="child-profile-form__section child-profile-form__section--checkbox">
        <label className={`child-profile-form__checkbox-label ${explicitDisabled ? 'child-profile-form__checkbox-label--disabled' : ''}`}>
          <input
            type="checkbox"
            name="explicitContentAllowed"
            checked={explicitDisabled ? false : formData.explicitContentAllowed}
            onChange={handleChange}
            className="child-profile-form__checkbox"
            disabled={isSubmitting || explicitDisabled}
          />
          <span className="child-profile-form__checkbox-text">
            <strong>Allow Explicit Content</strong>
            <small>Include mature themes and content in stories</small>
          </span>
        </label>
        {explicitDisabled && (
          <p className="child-profile-form__explicit-notice">
            {EXPLICIT_CONTENT_DISABLED_MESSAGE}
          </p>
        )}
      </div>

      <div className="child-profile-form__actions">
        <button 
          type="button"
          className="child-profile-form__cancel"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button 
          type="submit" 
          className="child-profile-form__submit"
          disabled={isSubmitting || !formData.displayName || !formData.birthday}
        >
          {isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Add Profile')}
        </button>
      </div>
    </form>
  );
}

export default ChildProfileForm;


