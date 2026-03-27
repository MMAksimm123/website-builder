import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/logo/Logo';
import ExampleCards from '../components/exampleCards/ExampleCards';
import '../style/MainPage/Main.css';
import UserProgects from '../components/userProgects/UserProgects';
import LogoutButton from '../components/LogoutButton/LogoutButton';
import { api } from '../services/api';

// Обновляем интерфейс Template, делаем поля опциональными для совместимости с API
interface Template {
  id: number;
  name: string;
  description?: string; // делаем опциональным
  thumbnail_url?: string;
  created_at: string;
  html: string;
  css: string;
  js: string;
}

function Main() {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const token = api.getToken();

        if (!token) {
          navigate('/login');
          return;
        }

        const { data: userData, error: userError } = await api.getCurrentUser();
        if (userError || !userData?.user) {
          api.clearToken();
          navigate('/login');
          return;
        }

        // Загружаем список шаблонов
        const { data, error } = await api.getTemplates();

        if (error) throw new Error(error);

        if (data?.templates) {
          // Загружаем полные данные каждого шаблона
          const fullTemplates = await Promise.all(
            data.templates.map(async (template: { id: number }) => {
              const { data: fullData, error: templateError } = await api.getTemplate(template.id);
              if (templateError) {
                console.error(`Error loading template ${template.id}:`, templateError);
                return null;
              }
              return fullData?.template;
            })
          );

          // Фильтруем успешно загруженные шаблоны и приводим к нужному типу
          const validTemplates = fullTemplates.filter((t): t is Template =>
            t !== null && t !== undefined
          );

          setTemplates(validTemplates);
        }
      } catch (err) {
        console.error('Error loading templates:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [navigate]);

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="main-container">
        <header className='headerPanel'>
          <Logo createSitePath='main'/>
          <LogoutButton />
        </header>
        <div className="loading-templates">
          <div className="spinner"></div>
          <p>Загрузка шаблонов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-container">
      <header className='headerPanel'>
        <Logo createSitePath='main'/>
        <LogoutButton />
      </header>

      <div className='mainContainer'>
        <div className="projects-section">
          <UserProgects />
        </div>

        <div className="templates-section">
          <div className="templates-header">
            <h2>Готовые шаблоны</h2>
            <div className="templates-controls">
              <div className="search-container">
                <input
                  type="text"
                  placeholder="Поиск шаблонов..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>
          </div>

          <div className="templates-grid">
            {filteredTemplates.length > 0 ? (
              filteredTemplates.map(template => (
                <ExampleCards
                  key={template.id}
                  templateId={template.id}
                  name={template.name}
                  templateData={{
                    html: template.html,
                    css: template.css,
                    js: template.js
                  }}
                />
              ))
            ) : (
              <div className="no-templates">
                <p>Шаблоны не найдены</p>
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')}>
                    Сбросить поиск
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Main;
