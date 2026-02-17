import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../database/supabaseClient';
import '../style/AuthCallback/AuthCallback.css';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Auth callback error:', error);
        navigate('/login');
        return;
      }

      if (session) {
        // Небольшая задержка для плавности
        setTimeout(() => {
          navigate('/main');
        }, 1000);
      } else {
        navigate('/login');
      }
    };

    handleAuthCallback();
  }, [navigate]);

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
