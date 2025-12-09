import { Layout, Logo, Button } from '../../components';
import { buildLogoutUrl } from '../../utils/auth';
import './HomePage.css';

function HomePage({ profile, onNavigateToProfile }) {
  const getDisplayName = () => {
    if (!profile) return 'there';
    if (profile.givenName && profile.familyName) {
      return `${profile.givenName} ${profile.familyName}`;
    }
    if (profile.givenName) return profile.givenName;
    if (profile.email) return profile.email.split('@')[0];
    return 'there';
  };

  const header = (
    <>
      <Logo size="sm" />
      <div className="home-page__header-actions">
        <button 
          className="home-page__profile-btn"
          onClick={onNavigateToProfile}
        >
          Profile
        </button>
        <Button as="a" href={buildLogoutUrl()} variant="ghost" size="sm">
          Sign Out
        </Button>
      </div>
    </>
  );

  return (
    <Layout header={header}>
      <div className="home-page">
        <h1 className="home-page__greeting">
          Hello, {getDisplayName()}!
        </h1>
        <p className="home-page__message">Welcome to SkaldCraft</p>
      </div>
    </Layout>
  );
}

export default HomePage;
