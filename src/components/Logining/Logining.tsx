import { useState, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../database/supabaseClient';
import '../../style/Logining/Logining.css';
import { handleNavigate } from '../../functions/Navigate/Navigate';
import { signInWithGitHub } from '../../database/socialAuth';

interface CustomLoginingProps {
  createPath?: string;
}

interface LocationState {
  email?: string;
  registrationSuccess?: boolean;
}

const Logining = ({ createPath = "registration" }: CustomLoginingProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      navigate('/main');

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка при входе');
    } finally {
      setLoading(false);
    }
  };

  const handleGitHubLogin = async () => {
    setGithubLoading(true);
    setError('');

    try {
      const { error } = await signInWithGitHub();
      if (error) throw error;
      // Перенаправление произойдет автоматически через OAuth
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка при входе через GitHub');
      setGithubLoading(false);
    }
  };

  return (
    <div className="borderWindow">
      <h3 className="titleBlock">Вход</h3>
      {location.state?.registrationSuccess && (
        <div className="success-message">
          Регистрация успешна! Войдите используя ваш email
        </div>
      )}
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleLogin}>
        <div className="areaInputs">
          <input
            title='Почта'
            className='input'
            type="email"
            placeholder='Почта'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className='input'
            type="password"
            placeholder='Пароль'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className='buttonGroup'>
          <button className='buttonLog' type="submit" disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
          <a
            type="button"
            onClick={() => handleNavigate(navigate, createPath)}
            className='link'
          >
            Еще не зарегистрирован
          </a>
        </div>
      </form>

      <div className="social-divider">
        <span className="divider-line"></span>
        <span className="divider-text">или</span>
        <span className="divider-line"></span>
      </div>

      <button
        onClick={handleGitHubLogin}
        disabled={githubLoading}
        className="github-button"
      >
        {githubLoading ? (
          'Подключение к GitHub...'
        ) : (
          <>
            <svg className="github-icon" viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02.8-.22 1.65-.33 2.5-.33.85 0 1.7.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/>
            </svg>
            Войти через GitHub
          </>
        )}
      </button>
    </div>
  );
};

export default Logining;
