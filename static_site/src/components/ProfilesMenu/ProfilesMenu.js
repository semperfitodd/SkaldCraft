import { useState } from 'react';
import './ProfilesMenu.css';

function ProfilesMenu({ 
  profiles, 
  activeProfile, 
  onSelectProfile, 
  onAddProfile, 
  onEditProfile 
}) {
  const [isOpen, setIsOpen] = useState(false);

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

  return (
    <div className="profiles-menu">
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
        <div className="profiles-menu__dropdown">
          <div className="profiles-menu__section">
            <div className="profiles-menu__section-title">Parent</div>
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
        </div>
      )}
    </div>
  );
}

export default ProfilesMenu;

