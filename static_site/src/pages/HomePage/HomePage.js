import { useState, useEffect } from 'react';
import { Layout, Logo, Button, Loading } from '../../components';
import { buildLogoutUrl } from '../../utils/auth';
import { fetchGreeting } from '../../utils/api';
import './HomePage.css';

function HomePage() {
  const [greeting, setGreeting] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchGreeting()
      .then((data) => setGreeting(data.message))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const header = (
    <>
      <Logo size="sm" />
      <Button as="a" href={buildLogoutUrl()} variant="ghost" size="sm">
        Sign Out
      </Button>
    </>
  );

  if (loading) {
    return (
      <Layout header={header}>
        <Loading />
      </Layout>
    );
  }

  return (
    <Layout header={header}>
      <div className="home-page">
        <h1 className="home-page__greeting">{error ? 'Welcome!' : greeting}</h1>
        <p className="home-page__message">Welcome to SkaldCraft</p>
      </div>
    </Layout>
  );
}

export default HomePage;

