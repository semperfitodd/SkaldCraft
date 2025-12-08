import { useAuth } from './hooks';
import { Loading } from './components';
import { LoginPage, HomePage } from './pages';

function App() {
  const { authenticated, user, loading, error } = useAuth();

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <Loading message={error} />;
  }

  if (!authenticated) {
    return <LoginPage />;
  }

  return <HomePage user={user} />;
}

export default App;
