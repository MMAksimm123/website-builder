import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../database/supabaseClient';
import Logo from '../components/logo/Logo';
import ExampleCards from '../components/exampleCards/ExampleCards';
import exampleImg1 from '../picture/examplesWebsite/example1.png';
import exampleImg2 from '../picture/examplesWebsite/example2.png';
import exampleImg3 from '../picture/examplesWebsite/example3.png';
import '../style/MainPage/Main.css';
import UserProgects from '../components/userProgects/UserProgects';

interface CustomLoginingProps {
  createPath?: string;
}

function Main({ createPath = "dev" }: CustomLoginingProps) {
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
      <div className='mainContainer'>
        <div>
          <UserProgects />
        </div>
        <div className='cardsExample'>
          {/* Передаем ID шаблонов из базы данных */}
          <ExampleCards image={exampleImg1} templateId={1} />
          {/* <ExampleCards image={exampleImg2} templateId={2} />
          <ExampleCards image={exampleImg3} templateId={3} />
          <ExampleCards image={exampleImg3} templateId={5} /> */}
      </div>
      </div>
    </div>
  );
}

export default Main;
