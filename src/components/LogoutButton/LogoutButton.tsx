import { useNavigate } from 'react-router-dom';
import '../../style/LogoutButton/LogoutButton.css';
import { api } from '../../services/api';

const LogoutButton = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      api.logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <button className="logout-button" onClick={handleLogout}>
      Выйти
    </button>
  );
};

export default LogoutButton;
