import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/logo/Logo';
import ExampleCards from '../components/exampleCards/ExampleCards';
import DragAndDropUploader from '../components/dragAndDropUploader/DragAndDropUploader';
import '../style/MainPage/Main.css';
import UserProgects from '../components/userProgects/UserProgects';
import LogoutButton from '../components/LogoutButton/LogoutButton';
import { api } from '../services/api';

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
  const [showUploadModal, setShowUploadModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const token = api.getToken();
        console.log('Main - токен:', token ? 'есть' : 'нет');

        if (!token) {
          console.log('Нет токена, перенаправление на login');
          navigate('/login');
          return;
        }

        const { data: userData, error: userError } = await api.getCurrentUser();
        console.log('Main - userData:', userData);
        console.log('Main - userError:', userError);

        if (userError || !userData?.user) {
          console.log('Ошибка получения пользователя, очищаем токен');
          api.clearToken();
          navigate('/login');
          return;
        }

        const templateFolders = ['template1', 'template2', 'template3', 'template4'];
        const loadedTemplates = await Promise.all(
          templateFolders.map(async (folder, index) => {
            try {
              const htmlResponse = await fetch(`/template/${folder}/index.html`);
              const cssResponse = await fetch(`/template/${folder}/style.css`);
              const jsResponse = await fetch(`/template/${folder}/index.js`);

              if (!htmlResponse.ok || !cssResponse.ok || !jsResponse.ok) {
                console.warn(`Template ${folder} files not found`);
                return null;
              }

              const html = await htmlResponse.text();
              const css = await cssResponse.text();
              const js = await jsResponse.text();

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
        <div className="header-actions">
          <button
            className="upload-project-btn"
            onClick={() => setShowUploadModal(true)}
          >
            <svg className="upload-icon" viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
            </svg>
            Загрузить свой проект из локальных файлов
          </button>
          <LogoutButton />
        </div>
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

      {/* Модальное окно для загрузки проекта */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content upload-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Загрузить свой проект из локальных файлов</h3>
              <button
                className="modal-close-btn"
                onClick={() => setShowUploadModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <DragAndDropUploader />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Main;
