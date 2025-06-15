import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleNavigate } from '../../functions/Navigate/Navigate';
import '../../style/Logining/Logining.css';
import { supabase } from '../../database/supabaseClient';

interface CustomLoginingProps {
  createPath?: string;
}

const Registration = ({ createPath = "login" }: CustomLoginingProps) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
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
    </div>
  );
};

export default Registration;
