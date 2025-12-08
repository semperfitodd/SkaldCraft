import { Layout, Logo, Button } from '../../components';
import { buildLogoutUrl } from '../../utils/auth';
import './HomePage.css';

function HomePage({ user }) {
  const displayName = user?.given_name || user?.email?.split('@')[0] || 'there';

  const header = (
    <>
      <Logo size="sm" />
      <Button as="a" href={buildLogoutUrl()} variant="ghost" size="sm">
        Sign Out
      </Button>
    </>
  );

  return (
    <Layout header={header}>
      <div className="home-page">
        <h1 className="home-page__greeting">Hello, {displayName}!</h1>
        <p className="home-page__message">Welcome to SkaldCraft</p>
      </div>
    </Layout>
  );
}

export default HomePage;

