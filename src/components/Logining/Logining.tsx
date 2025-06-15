import { useState, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../database/supabaseClient';
import '../../style/Logining/Logining.css';
import { handleNavigate } from '../../functions/Navigate/Navigate';

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
    </div>
  );
};

export default Logining;
