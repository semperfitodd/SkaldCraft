import './Button.css';

function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  fullWidth = false,
  as: Component = 'button',
  icon,
  ...props 
}) {
  const className = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth && 'btn--full',
  ].filter(Boolean).join(' ');

  return (
    <Component className={className} {...props}>
      {icon && <span className="btn__icon">{icon}</span>}
      {children}
    </Component>
  );
}

export default Button;


