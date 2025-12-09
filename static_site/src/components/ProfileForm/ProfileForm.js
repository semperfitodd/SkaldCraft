import { useState, useEffect } from 'react';
import { PROFILE_OPTIONS } from '../../utils/api';
import './ProfileForm.css';

function ProfileForm({ 
  initialProfile, 
  onSubmit, 
  isSubmitting = false,
  submitLabel = 'Save Profile',
  showTitle = true,
  title = 'Reading Preferences'
}) {
  const [formData, setFormData] = useState({
    birthday: '',
    preferredGenres: ['fantasy'],
    defaultLanguage: 'en',
    explicitContentAllowed: false,
  });

  useEffect(() => {
    if (initialProfile) {
      setFormData({
        birthday: initialProfile.birthday || '',
        preferredGenres: initialProfile.preferredGenres || ['fantasy'],
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

  return (
    <form className="profile-form" onSubmit={handleSubmit}>
      {showTitle && <h2 className="profile-form__title">{title}</h2>}

      <div className="profile-form__section">
        <label className="profile-form__label">Birthday</label>
        <p className="profile-form__hint">When were you born?</p>
        <input
          type="date"
          name="birthday"
          value={formData.birthday}
          onChange={handleChange}
          className="profile-form__input"
          disabled={isSubmitting}
        />
      </div>

      <div className="profile-form__section">
        <label className="profile-form__label">Favorite Genres</label>
        <p className="profile-form__hint">Select all genres you enjoy (at least one)</p>
        <div className="profile-form__genres">
          {PROFILE_OPTIONS.genres.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`profile-form__genre-btn ${
                formData.preferredGenres.includes(opt.value) ? 'profile-form__genre-btn--active' : ''
              }`}
              onClick={() => handleGenreToggle(opt.value)}
              disabled={isSubmitting}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="profile-form__section">
        <label className="profile-form__label">Default Language</label>
        <p className="profile-form__hint">Your preferred language for stories</p>
        <select
          name="defaultLanguage"
          value={formData.defaultLanguage}
          onChange={handleChange}
          className="profile-form__select"
          disabled={isSubmitting}
        >
          {PROFILE_OPTIONS.languages.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="profile-form__section profile-form__section--checkbox">
        <label className="profile-form__checkbox-label">
          <input
            type="checkbox"
            name="explicitContentAllowed"
            checked={formData.explicitContentAllowed}
            onChange={handleChange}
            className="profile-form__checkbox"
            disabled={isSubmitting}
          />
          <span className="profile-form__checkbox-text">
            <strong>Allow Explicit Content</strong>
            <small>Include mature themes and content in stories</small>
          </span>
        </label>
      </div>

      <button 
        type="submit" 
        className="profile-form__submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Saving...' : submitLabel}
      </button>
    </form>
  );
}

export default ProfileForm;
