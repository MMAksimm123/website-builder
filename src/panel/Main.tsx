import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../database/supabaseClient';
import Logo from '../components/logo/Logo';
import ExampleCards from '../components/exampleCards/ExampleCards';
import exampleImg1 from '../picture/examplesWebsite/example1.png';
import exampleImg2 from '../picture/examplesWebsite/example2.png';
import exampleImg3 from '../picture/examplesWebsite/example3.png';
import '../style/MainPage/Main.css';

function Main() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
          navigate('/login');
          return;
        }

        // Явно проверяем что email есть и это строка
        if (user.email && typeof user.email === 'string') {
          setUserEmail(user.email);
        } else {
          setUserEmail(null);
          navigate('/login');
        }
      } catch (err) {
        console.error('Ошибка при получении пользователя:', err);
        navigate('/login');
      }
    };

    fetchUser();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    }
  };

  return (
    <div className="main-container">
      <header>
        <Logo />
      </header>
      {/* <h1>Добро пожаловать!</h1>
      {userEmail && <p>Вы вошли как: {userEmail}</p>}
      <button onClick={handleLogout} className="logout-button">
        Выйти
      </button> */}
      <div className='cardsExample'>
        <ExampleCards image={exampleImg1}/>
        <ExampleCards image={exampleImg2} />
        <ExampleCards image={exampleImg3} />
      </div>
    </div>
  );
}

export default Main;
