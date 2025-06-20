// src/components/Main.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../database/supabaseClient';
import Logo from '../components/logo/Logo';
import ExampleCards from '../components/exampleCards/ExampleCards';
import exampleImg1 from '../picture/examplesWebsite/example1.png';
import '../style/MainPage/Main.css';
import UserProgects from '../components/userProgects/UserProgects';
import { loadTemplateFiles } from '../utils/loadTemplate';

function Main() {
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<{ html: string; css: string; js: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Проверяем аутентификацию пользователя
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          navigate('/login');
          return;
        }

        // Загружаем шаблон из файлов
        const templateData = await loadTemplateFiles(1);
        setTemplate(templateData);
      } catch (err) {
        console.error('Initial data loading error:', err);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [navigate]);

  if (loading) return <div>Loading...</div>;

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
          {template && (
            <ExampleCards
              image={exampleImg1}
              templateData={template}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default Main;
