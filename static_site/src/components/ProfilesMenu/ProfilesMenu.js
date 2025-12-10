import { useState, useRef, useEffect } from 'react';
import './ProfilesMenu.css';

function ProfilesMenu({ 
  profiles, 
  activeProfile, 
  onSelectProfile, 
  onAddProfile, 
  onEditProfile,
  onNavigateToHome,
  onNavigateToStories,
  onNavigateToSettings,
  onSignOut
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Prevent body scroll when menu is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isOpen]);

  const getActiveDisplayName = () => {
    if (!activeProfile) return 'Select Profile';
    if (activeProfile.type === 'adult') {
      return profiles?.parent?.displayName || 'Adult';
    }
    const child = profiles?.children?.find(c => c.profileId === activeProfile.profileId);
    return child?.displayName || 'Child';
  };

  const handleSelectProfile = (type, profileId = null) => {
    onSelectProfile({ type, profileId });
    setIsOpen(false);
  };

  const handleNavigate = (callback) => {
    if (callback) {
      callback();
    }
    setIsOpen(false);
  };

  return (
    <div className="profiles-menu" ref={menuRef}>
      <button 
        className="profiles-menu__trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="profiles-menu__avatar">
          {getActiveDisplayName().charAt(0).toUpperCase()}
        </span>
        <span className="profiles-menu__name">{getActiveDisplayName()}</span>
        <span className="profiles-menu__chevron">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <>
          <div className="profiles-menu__dropdown">
          {/* Navigation Section */}
          {(onNavigateToHome || onNavigateToStories || onNavigateToSettings) && (
            <div className="profiles-menu__section">
              <div className="profiles-menu__section-title">Navigation</div>
              {onNavigateToHome && (
                <button
                  className="profiles-menu__nav-item"
                  onClick={() => handleNavigate(onNavigateToHome)}
                >
                  <span className="profiles-menu__nav-icon">🏠</span>
                  <span className="profiles-menu__nav-text">Home</span>
                </button>
              )}
              {onNavigateToStories && (
                <button
                  className="profiles-menu__nav-item"
                  onClick={() => handleNavigate(onNavigateToStories)}
                >
                  <span className="profiles-menu__nav-icon">📚</span>
                  <span className="profiles-menu__nav-text">Stories</span>
                </button>
              )}
              {onNavigateToSettings && (
                <button
                  className="profiles-menu__nav-item"
                  onClick={() => handleNavigate(onNavigateToSettings)}
                >
                  <span className="profiles-menu__nav-icon">⚙️</span>
                  <span className="profiles-menu__nav-text">Settings</span>
                </button>
              )}
            </div>
          )}

          {/* Profiles Section */}
          <div className="profiles-menu__section">
            <div className="profiles-menu__section-title">Profiles</div>
            <button
              className={`profiles-menu__item ${activeProfile?.type === 'adult' ? 'profiles-menu__item--active' : ''}`}
              onClick={() => handleSelectProfile('adult')}
            >
              <span className="profiles-menu__item-avatar">
                {profiles?.parent?.displayName?.charAt(0).toUpperCase() || 'A'}
              </span>
              <span className="profiles-menu__item-name">
                {profiles?.parent?.displayName || 'Adult'} (Adult)
              </span>
            </button>
          </div>

          {profiles?.children?.length > 0 && (
            <div className="profiles-menu__section">
              <div className="profiles-menu__section-title">Children</div>
              {profiles.children.map((child) => (
                <div key={child.profileId} className="profiles-menu__item-row">
                  <button
                    className={`profiles-menu__item ${activeProfile?.profileId === child.profileId ? 'profiles-menu__item--active' : ''}`}
                    onClick={() => handleSelectProfile('child', child.profileId)}
                  >
                    <span className="profiles-menu__item-avatar">
                      {child.displayName.charAt(0).toUpperCase()}
                    </span>
                    <span className="profiles-menu__item-name">{child.displayName}</span>
                  </button>
                  <button
                    className="profiles-menu__edit-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditProfile(child);
                      setIsOpen(false);
                    }}
                    title="Edit profile"
                  >
                    ✎
                  </button>
                </div>
              ))}
            </div>
          )}

          {(profiles?.children?.length || 0) < 5 && (
            <div className="profiles-menu__section">
              <button
                className="profiles-menu__add-btn"
                onClick={() => {
                  onAddProfile();
                  setIsOpen(false);
                }}
              >
                + Add Child Profile
              </button>
            </div>
          )}

          {/* Sign Out Section */}
          {onSignOut && (
            <div className="profiles-menu__section">
              <button
                className="profiles-menu__signout-btn"
                onClick={() => handleNavigate(onSignOut)}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
        <div className="profiles-menu__backdrop" onClick={() => setIsOpen(false)} />
        </>
      )}
    </div>
  );
}

export default ProfilesMenu;
