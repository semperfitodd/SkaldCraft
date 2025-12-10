import { Button, Logo, AppleIcon, GoogleIcon } from '../../components';
import { buildAuthUrl } from '../../utils/auth';
import config from '../../utils/config';
import './LoginPage.css';

function LoginPage() {
  return (
    <div className="login-page">
      <div className="login-page__content">
        <Logo size="lg" />
        <p className="login-page__tagline">AI-Powered Reading for All Levels</p>
        
        <div className="login-page__buttons">
          <Button 
            as="a" 
            href={buildAuthUrl(config.providers.apple)} 
            variant="white" 
            fullWidth
            icon={<AppleIcon />}
          >
            Continue with Apple
          </Button>
          <Button 
            as="a" 
            href={buildAuthUrl(config.providers.google)} 
            variant="white" 
            fullWidth
            icon={<GoogleIcon />}
          >
            Continue with Google
          </Button>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;



