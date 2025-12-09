import { useAuth } from './hooks';
import { Loading } from './components';
import { LoginPage, HomePage } from './pages';

function App() {
  const { authenticated, loading, error } = useAuth();

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <Loading message={error} />;
  }

  if (!authenticated) {
    return <LoginPage />;
  }

  return <HomePage />;
}

export default App;
