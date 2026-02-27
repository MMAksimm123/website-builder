import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import '../style/AuthCallback/AuthCallback.css';

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const params = new URLSearchParams(location.search);
      const token = params.get('token');
      const error = params.get('error');

      console.log('Auth callback - token:', token ? 'получен' : 'не получен');
      console.log('Auth callback - error:', error);

      if (error) {
        console.error('Auth callback error:', error);
        navigate('/login?error=auth_failed');
        return;
      }

      if (token) {
        api.setToken(token);
        console.log('Токен сохранен, перенаправление на /main');

        setTimeout(() => {
          navigate('/main');
        }, 1000);
      } else {
        console.log('Токен не получен, перенаправление на /login');
        navigate('/login');
      }
    };

    handleAuthCallback();
  }, [navigate, location]);

  return (
    <div className="auth-callback-container">
      <div className="loading-card">
        <div className="spinner"></div>
        <p className="loading-text">Завершение аутентификации...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
