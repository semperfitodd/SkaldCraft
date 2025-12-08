import './Logo.css';

function Logo({ size = 'md', showText = true }) {
  const sizeClass = `logo--${size}`;
  
  return (
    <div className={`logo ${sizeClass}`}>
      <img src="/app.png" alt="" className="logo__image" />
      {showText && <span className="logo__text">SkaldCraft</span>}
    </div>
  );
}

export default Logo;

