import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../database/supabaseClient';
import Logo from '../components/logo/Logo';
import ExampleCards from '../components/exampleCards/ExampleCards';
import '../style/MainPage/Main.css';
import UserProgects from '../components/userProgects/UserProgects';
import LogoutButton from '../components/LogoutButton/LogoutButton';

interface Template {
  id: number;
  name: string;
  path: string;
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
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          navigate('/login');
          return;
        }

        // Загружаем шаблоны из папок template1-4
        const templateFolders = ['template1', 'template2', 'template3', 'template4'];
        const loadedTemplates = await Promise.all(
          templateFolders.map(async (folder, index) => {
            try {
              const htmlResponse = await fetch(`/template/${folder}/index.html`);
              const cssResponse = await fetch(`/template/${folder}/style.css`);
              const jsResponse = await fetch(`/template/${folder}/index.js`);

              // Проверяем успешность загрузки
              if (!htmlResponse.ok || !cssResponse.ok || !jsResponse.ok) {
                console.warn(`Template ${folder} files not found`);
                return null;
              }

              const html = await htmlResponse.text();
              const css = await cssResponse.text();
              const js = await jsResponse.text();

              // Извлекаем название из HTML или используем имя папки
              const titleMatch = html.match(/<title>(.*?)<\/title>/i);
              const name = titleMatch ? titleMatch[1] : `Шаблон ${index + 1}`;

              return {
                id: index + 1,
                name: name,
                path: folder,
                html,
                css,
                js
              };
            } catch (error) {
              console.error(`Error loading template ${folder}:`, error);
              return null;
            }
          })
        );

        // Фильтруем успешно загруженные шаблоны
        const validTemplates = loadedTemplates.filter(t => t !== null) as Template[];
        setTemplates(validTemplates);

      } catch (err) {
        console.error('Error loading templates:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [navigate]);

  // Фильтрация шаблонов по поиску
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
              {/* Поиск */}
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

          {/* Сетка шаблонов */}
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
