import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleNavigate } from '../../functions/Navigate/Navigate';
import '../../style/Logining/Logining.css';
import { supabase } from '../../database/supabaseClient';
import { signInWithGitHub } from '../../database/socialAuth';

interface CustomLoginingProps {
  createPath?: string;
}

const Registration = ({ createPath = "/login" }: CustomLoginingProps) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRegistration = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      setLoading(false);
      return;
    }

    try {
      const { error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: '',
            avatar_url: ''
          }
        }
      });

      if (authError) throw authError;

      navigate(createPath, {
        state: {
          registrationSuccess: true,
          email: formData.email
        }
      });

    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message.includes('User already registered')
          ? 'Пользователь с таким email уже зарегистрирован'
          : error.message);
      } else {
        setError('Произошла неизвестная ошибка при регистрации');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGitHubSignUp = async () => {
    setGithubLoading(true);
    setError('');

    try {
      const { error } = await signInWithGitHub();
      if (error) throw error;
      // Перенаправление произойдет автоматически
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка при регистрации через GitHub');
      setGithubLoading(false);
    }
  };

  return (
    <div className="borderWindow">
      <h3 className="titleBlock">Регистрация</h3>
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleRegistration}>
        <div className="areaInputs">
          <input
            name="email"
            title="Почта"
            className="input"
            type="email"
            placeholder="Почта"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            name="password"
            className="input"
            type="password"
            placeholder="Пароль"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
          />
          <input
            name="confirmPassword"
            className="input"
            type="password"
            placeholder="Подтвердите пароль"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            minLength={6}
          />
        </div>
        <div className="buttonGroup">
          <button
            className="buttonLog"
            type="submit"
            disabled={loading || !formData.email || !formData.password || !formData.confirmPassword}
            aria-busy={loading}
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
          <a
            type="button"
            onClick={() => handleNavigate(navigate, createPath)}
            className="link"
          >
            Уже зарегистрирован
          </a>
        </div>
      </form>

      <div className="social-divider">
        <span className="divider-line"></span>
        <span className="divider-text">или</span>
        <span className="divider-line"></span>
      </div>

      <button
        onClick={handleGitHubSignUp}
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
            Зарегистрироваться через GitHub
          </>
        )}
      </button>
    </div>
  );
};

export default Registration;
