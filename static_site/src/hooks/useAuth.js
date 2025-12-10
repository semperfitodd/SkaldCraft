import { useState, useEffect, useCallback } from 'react';
import { 
  isAuthenticated, 
  getUserFromToken, 
  exchangeCodeForTokens, 
  saveTokens, 
  clearTokens 
} from '../utils/auth';

const ROUTES = {
  CALLBACK: '/auth/callback',
  LOGOUT: '/logout',
  HOME: '/',
};

function useAuth() {
  const [state, setState] = useState({
    authenticated: false,
    user: null,
    loading: true,
    error: null,
  });

  const handleCallback = useCallback(async (code) => {
    try {
      const tokens = await exchangeCodeForTokens(code);
      saveTokens(tokens);
      window.history.replaceState({}, '', ROUTES.HOME);
      setState({
        authenticated: true,
        user: getUserFromToken(),
        loading: false,
        error: null,
      });
    } catch (err) {
      window.history.replaceState({}, '', ROUTES.HOME);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'Authentication failed. Please try again.',
      }));
    }
  }, []);

  const handleLogout = useCallback(() => {
    clearTokens();
    window.history.replaceState({}, '', ROUTES.HOME);
    setState({
      authenticated: false,
      user: null,
      loading: false,
      error: null,
    });
  }, []);

  const checkAuth = useCallback(() => {
    const authenticated = isAuthenticated();
    setState({
      authenticated,
      user: authenticated ? getUserFromToken() : null,
      loading: false,
      error: null,
    });
  }, []);

  useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (path === ROUTES.CALLBACK && code) {
      handleCallback(code);
    } else if (path === ROUTES.LOGOUT) {
      handleLogout();
    } else {
      checkAuth();
    }
  }, [handleCallback, handleLogout, checkAuth]);

  return state;
}

export default useAuth;


