import { useState, useEffect, useCallback } from 'react';
import './VikingIntro.css';

const EXIT_ANIMATION_DURATION = 500;
const AUTO_COMPLETE_DURATION = 10000;

function VikingIntro({ onComplete }) {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(true);

  const handleComplete = useCallback(() => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      onComplete();
    }, EXIT_ANIMATION_DURATION);
  }, [onComplete]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleComplete();
    }, AUTO_COMPLETE_DURATION);

    return () => clearTimeout(timer);
  }, [handleComplete]);

  if (!isVisible) return null;

  return (
    <div className={`viking-intro ${isAnimating ? 'viking-intro--active' : 'viking-intro--exit'}`}>
      <div className="viking-intro__content">
        <div className="viking-intro__scene">
          <div className="viking-intro__campfire">
            <div className="viking-intro__flame viking-intro__flame--1"></div>
            <div className="viking-intro__flame viking-intro__flame--2"></div>
            <div className="viking-intro__flame viking-intro__flame--3"></div>
            <div className="viking-intro__logs"></div>
          </div>

          <div className="viking-intro__viking">
            <div className="viking-intro__viking-body">
              <div className="viking-intro__viking-head">
                <div className="viking-intro__viking-helmet"></div>
                <div className="viking-intro__viking-horns">
                  <div className="viking-intro__viking-horn viking-intro__viking-horn--left"></div>
                  <div className="viking-intro__viking-horn viking-intro__viking-horn--right"></div>
                </div>
              </div>
              <div className="viking-intro__viking-torso"></div>
              <div className="viking-intro__viking-arm viking-intro__viking-arm--left"></div>
              <div className="viking-intro__viking-arm viking-intro__viking-arm--right"></div>
            </div>
            <div className="viking-intro__book">
              <div className="viking-intro__book-pages"></div>
              <div className="viking-intro__book-glow"></div>
            </div>
          </div>

          <div className="viking-intro__runes">
            <span className="viking-intro__rune" style={{ '--delay': '0s' }}>ᚠ</span>
            <span className="viking-intro__rune" style={{ '--delay': '0.3s' }}>ᚢ</span>
            <span className="viking-intro__rune" style={{ '--delay': '0.6s' }}>ᚦ</span>
            <span className="viking-intro__rune" style={{ '--delay': '0.9s' }}>ᚨ</span>
            <span className="viking-intro__rune" style={{ '--delay': '1.2s' }}>ᚱ</span>
          </div>
        </div>

        <div className="viking-intro__text">
          <h1 className="viking-intro__title">SkaldCraft</h1>
          <p className="viking-intro__subtitle">Where legends come alive</p>
        </div>

        <button 
          className="viking-intro__skip"
          onClick={handleComplete}
          aria-label="Skip introduction"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

export default VikingIntro;


