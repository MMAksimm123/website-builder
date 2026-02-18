import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { supabase } from '../database/supabaseClient';
import '../style/DevArea/DevArea.css';
import Logo from '../components/logo/Logo';
import LogoutButton from '../components/LogoutButton/LogoutButton';
import ImageUploader from '../components/ImageUploader/ImageUploader';
import GithubSetup from '../components/GithubSetup/GithubSetup';
import GitHubClient from '../utils/github';

interface TemplateFiles {
  html: string;
  css: string;
  js: string;
}

type ViewportSize = 'desktop' | 'tablet' | 'mobile';

const VIEWPORT_SIZES = {
  desktop: { width: '100%', height: '100%', label: 'Десктоп' },
  tablet: { width: '768px', height: '1024px', label: 'Планшет' },
  mobile: { width: '375px', height: '667px', label: 'Мобильный' }
};

const SAVE_DEBOUNCE_DELAY = 2000;
const AUTO_SAVE_ENABLED = true;

// Функция для создания HTML с изолированной обработкой якорных ссылок и скрытыми полосами прокрутки
const createIsolatedHTML = (html: string, css: string, js: string) => {
  // Добавляем стили для скрытия полос прокрутки, но сохранения функционала
  const hideScrollbarStyles = `
    <style>
      /* Скрываем полосы прокрутки для всех браузеров */
      html {
        scrollbar-width: none; /* Firefox */
        -ms-overflow-style: none; /* IE and Edge */
      }

      html::-webkit-scrollbar {
        display: none; /* Chrome, Safari, Opera */
      }

      body {
        overflow: auto; /* Сохраняем возможность прокрутки */
        -webkit-overflow-scrolling: touch; /* Плавная прокрутка на iOS */
      }

      /* Для элементов с прокруткой внутри */
      * {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }

      *::-webkit-scrollbar {
        display: none;
      }
    </style>
  `;

  // Скрипт для правильной обработки якорных ссылок внутри iframe
  const anchorHandler = `
    <script>
      (function() {
        // Функция для прокрутки к элементу по якорю
        function scrollToAnchor(hash) {
          if (!hash || hash === '#') return;

          // Убираем символ # для поиска элемента
          const targetId = hash.substring(1);
          const targetElement = document.getElementById(targetId);

          if (targetElement) {
            targetElement.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
          }
        }

        // Перехватываем клики по ссылкам с якорями
        document.addEventListener('click', function(e) {
          const link = e.target.closest('a');
          if (!link || !link.hash) return;

          // Проверяем, является ли ссылка якорной (начинается с #)
          if (link.hash.startsWith('#')) {
            e.preventDefault();

            // Получаем только хеш часть
            const hash = link.hash;

            // Прокручиваем к элементу
            scrollToAnchor(hash);

            // Обновляем хеш в URL iframe (без перезагрузки страницы)
            if (window.location.hash !== hash) {
              history.replaceState(null, '', hash);
            }

            console.log('Anchor navigation:', hash);
            return false;
          }
        });

        // Обрабатываем начальный хеш при загрузке
        if (window.location.hash) {
          setTimeout(() => {
            scrollToAnchor(window.location.hash);
          }, 100);
        }

        // Перехватываем изменения хеша
        window.addEventListener('hashchange', function(e) {
          e.preventDefault();
          scrollToAnchor(window.location.hash);
        });

        // Переопределяем pushState для предотвращения изменения родительского URL
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function(state, title, url) {
          // Если это якорная ссылка (только хеш)
          if (typeof url === 'string' && url.startsWith('#')) {
            scrollToAnchor(url);
            originalReplaceState.call(this, state, title, url);
            return;
          }

          // Для обычных URL предотвращаем навигацию
          console.log('Navigation prevented in preview mode');
          originalReplaceState.call(this, state, title, window.location.pathname + window.location.search + (window.location.hash || ''));
        };

        history.replaceState = function(state, title, url) {
          // Если это якорная ссылка (только хеш)
          if (typeof url === 'string' && url.startsWith('#')) {
            scrollToAnchor(url);
            originalReplaceState.call(this, state, title, url);
            return;
          }

          // Для обычных URL предотвращаем навигацию
          console.log('Navigation prevented in preview mode');
          originalReplaceState.call(this, state, title, window.location.pathname + window.location.search + (window.location.hash || ''));
        };

        console.log('Anchor links isolation enabled for preview iframe');
      })();
    </script>
  `;

  // Собираем полный HTML с правильной структурой
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <base href="/">
    ${hideScrollbarStyles}
    <style>
      /* Базовые стили для предпросмотра */
      * {
        box-sizing: border-box;
        max-width: 100%;
      }
      img {
        max-width: 100%;
        height: auto;
      }

      /* Стили пользователя */
      ${css}
    </style>
    ${anchorHandler}
  </head>
  <body>
    ${html}
    <script>
      // Пользовательский JavaScript
      ${js}

      // Дополнительный код для эмуляции работы якорей
      (function() {
        // Если есть обработчики на window.onhashchange, сохраняем их
        const originalOnHashChange = window.onhashchange;

        window.onhashchange = function(e) {
          if (originalOnHashChange) {
            originalOnHashChange.call(this, e);
          }
        };
      })();
    </script>
  </body>
</html>
  `;
};

const EditProject = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js'>('html');
  const [code, setCode] = useState<TemplateFiles>({ html: '', css: '', js: '' });
  const [srcDoc, setSrcDoc] = useState('');
  const [projectName, setProjectName] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [viewportSize, setViewportSize] = useState<ViewportSize>('desktop');
  const [iframeKey, setIframeKey] = useState(Date.now());
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [githubStatus, setGithubStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [githubError, setGithubError] = useState('');
  const [githubRepo, setGithubRepo] = useState<string | null>(null);
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const editorRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  let saveTimer: NodeJS.Timeout;

  // Загрузка GitHub настроек из БД
  const loadGithubSettings = useCallback(async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_projects')
        .select('github_repo, github_token, github_last_sync')
        .eq('id', projectId)
        .single();

      if (error) throw error;

      if (data?.github_repo) {
        setGithubRepo(data.github_repo);
      }

      if (data?.github_token) {
        // В реальном проекте токен должен быть зашифрован!
        setGithubToken(data.github_token);
      }
    } catch (error) {
      console.error('Error loading GitHub settings:', error);
    }
  }, []);

  // Сохранение GitHub настроек в БД
  const saveGithubSettings = useCallback(async (projectId: string, repo: string, token: string) => {
    try {
      // Внимание: В реальном проекте токен должен быть зашифрован перед сохранением!
      // Это упрощенный вариант для демонстрации
      const { error } = await supabase
        .from('user_projects')
        .update({
          github_repo: repo,
          github_token: token, // НЕ ДЕЛАЙТЕ ТАК В РЕАЛЬНОМ ПРОЕКТЕ!
          github_last_sync: new Date().toISOString()
        })
        .eq('id', projectId);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving GitHub settings:', error);
      throw error;
    }
  }, []);

  // Обновление времени последней синхронизации
  const updateLastSync = useCallback(async (projectId: string) => {
    try {
      await supabase
        .from('user_projects')
        .update({
          github_last_sync: new Date().toISOString()
        })
        .eq('id', projectId);
    } catch (error) {
      console.error('Error updating last sync:', error);
    }
  }, []);

  // Обновление iframe с изолированным контентом
  const updateIframeContent = useCallback(() => {
    const isolatedHtml = createIsolatedHTML(code.html, code.css, code.js);
    setSrcDoc(isolatedHtml);
    setIframeKey(Date.now()); // Обновляем ключ для перезагрузки iframe
  }, [code]);

  useEffect(() => {
    const loadProject = async () => {
      setIsLoading(true);
      try {
        // Получаем текущего пользователя
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login');
          return;
        }
        setUserId(user.id);

        const state = location.state as { initialCode?: TemplateFiles } | null;

        if (state?.initialCode) {
          setCode(state.initialCode);
          setProjectName('Новый проект из шаблона');
          setIsLoading(false);
          return;
        }

        if (id) {
          const { data, error } = await supabase
            .from('user_projects')
            .select('html, css, js, name, github_repo, github_token, github_last_sync')
            .eq('id', id)
            .single();

          if (error) throw error;

          if (data) {
            const projectData = {
              html: data.html || '',
              css: data.css || '',
              js: data.js || ''
            };
            setCode(projectData);
            setProjectName(data.name || `Проект ${id}`);

            // Загружаем GitHub настройки
            if (data.github_repo) {
              setGithubRepo(data.github_repo);
            }
            if (data.github_token) {
              setGithubToken(data.github_token);
            }
          }
        }
      } catch (error) {
        console.error('Project loading error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProject();
  }, [id, location.state, navigate]);

  const saveProject = useCallback(async (currentCode: TemplateFiles) => {
    if (!id || !AUTO_SAVE_ENABLED) return;

    setSaveStatus('saving');
    clearTimeout(saveTimer);

    try {
      const { error } = await supabase
        .from('user_projects')
        .update({
          html: currentCode.html,
          css: currentCode.css,
          js: currentCode.js,
          updated_at: new Date()
        })
        .eq('id', id);

      if (!error) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('idle');
    }
  }, [id]);

  const handleEditorChange = (value: string | undefined, language: 'html' | 'css' | 'js') => {
    if (value === undefined) return;

    const newCode = { ...code, [language]: value };
    setCode(newCode);

    if (AUTO_SAVE_ENABLED && id) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => saveProject(newCode), SAVE_DEBOUNCE_DELAY);
    }
  };

  // Обновляем iframe при изменении кода с debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      updateIframeContent();
    }, 250);

    return () => clearTimeout(timer);
  }, [code, updateIframeContent]);

  const handleSaveToZip = () => {
    const zip = new JSZip();
    zip.file("index.html", code.html);
    zip.file("style.css", code.css);
    zip.file("script.js", code.js);
    zip.generateAsync({ type: "blob" }).then((content) => {
      saveAs(content, `${projectName.replace(/\s+/g, '_')}.zip`);
    });
  };

  const getViewportStyle = () => {
    const size = VIEWPORT_SIZES[viewportSize];
    return {
      maxWidth: size.width,
      width: viewportSize === 'desktop' ? '100%' : size.width,
      height: viewportSize === 'desktop' ? '100%' : size.height,
      margin: '0 auto',
      transition: 'all 0.3s ease'
    };
  };

  // Функция для вставки текста в редактор
  const insertTextAtCursor = (text: string) => {
    if (!editorRef.current) return;

    const selection = editorRef.current.getSelection();
    const range = {
      startLineNumber: selection.startLineNumber,
      startColumn: selection.startColumn,
      endLineNumber: selection.endLineNumber,
      endColumn: selection.endColumn
    };

    editorRef.current.executeEdits('insert-image', [{
      range,
      text: text,
      forceMoveMarkers: true
    }]);
  };

  const handleGithubSave = async (config: { token: string; repo: string; isPrivate: boolean }) => {
    if (!id) {
      setGithubError('Сначала сохраните проект');
      setGithubStatus('error');
      setTimeout(() => setGithubStatus('idle'), 3000);
      return;
    }

    setGithubStatus('saving');
    setGithubError('');
    setShowGithubModal(false);

    try {
      const client = new GitHubClient(config.token, config.repo);

      // Проверяем существование репозитория
      const exists = await client.checkRepoExists();

      if (!exists) {
        // Создаем новый репозиторий
        const repoName = config.repo.split('/')[1];
        await client.createRepo(repoName, config.isPrivate);
      }

      // Загружаем файлы
      await client.uploadProject(code, `Обновление: ${projectName}`);

      // Получаем URL репозитория
      const repoUrl = await client.getRepoUrl();

      // Сохраняем настройки в БД
      await saveGithubSettings(id, config.repo, config.token);

      setGithubRepo(config.repo);
      setGithubToken(config.token);
      setGithubStatus('success');

      // Обновляем время последней синхронизации
      await updateLastSync(id);

      // Показываем ссылку на репозиторий
      window.open(repoUrl, '_blank');

      setTimeout(() => setGithubStatus('idle'), 3000);
    } catch (error) {
      console.error('GitHub save error:', error);
      setGithubError(error instanceof Error ? error.message : 'Ошибка при сохранении на GitHub');
      setGithubStatus('error');

      setTimeout(() => setGithubStatus('idle'), 5000);
    }
  };

  if (isLoading) {
    return (
      <div className="dev-area">
        <header className='headerPanelDev'>
          <Logo createSitePath='main'/>
          <h2 className="project-title">Загрузка...</h2>
          <LogoutButton />
        </header>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Загрузка проекта...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dev-area">
      <header className='headerPanelDev'>
        <Logo createSitePath='main'/>
        <h2 className="project-title">Редактирование: {projectName}</h2>
        <div className="header-actions">
          <button
            className={`github-btn ${githubStatus}`}
            onClick={() => setShowGithubModal(true)}
            disabled={githubStatus === 'saving'}
            title={githubRepo ? `Репозиторий: ${githubRepo}` : 'Опубликовать на GitHub'}
          >
            {githubStatus === 'saving' ? (
              'Сохранение...'
            ) : githubStatus === 'success' ? (
              '✓ Сохранено'
            ) : githubStatus === 'error' ? (
              '❌ Ошибка'
            ) : (
              <>
                <svg className="github-icon" viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02.8-.22 1.65-.33 2.5-.33.85 0 1.7.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/>
                </svg>
                {githubRepo ? 'Обновить на GitHub' : 'Опубликовать на GitHub'}
              </>
            )}
          </button>
          <LogoutButton />
        </div>
      </header>

      {githubError && (
        <div className="github-error-banner">
          {githubError}
        </div>
      )}

      {githubRepo && (
        <div className="github-info-banner">
          <span>📦 Репозиторий: {githubRepo}</span>
          <a
            href={`https://github.com/${githubRepo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="github-repo-link"
          >
            Открыть на GitHub →
          </a>
        </div>
      )}

      <div className="viewport-controls">
        <div className="viewport-selector">
          <button
            className={`viewport-btn desktop ${viewportSize === 'desktop' ? 'active' : ''}`}
            onClick={() => setViewportSize('desktop')}
            title="Десктоп"
          >
            💻 Десктоп
          </button>
          <button
            className={`viewport-btn tablet ${viewportSize === 'tablet' ? 'active' : ''}`}
            onClick={() => setViewportSize('tablet')}
            title="Планшет"
          >
            📱 Планшет
          </button>
          <button
            className={`viewport-btn mobile ${viewportSize === 'mobile' ? 'active' : ''}`}
            onClick={() => setViewportSize('mobile')}
            title="Мобильный"
          >
            📱 Мобильный
          </button>
        </div>
      </div>

      <div className="main-content">
        <div className="preview-section">
          <div className="preview-container" style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            backgroundColor: '#f0f0f0',
            height: '100%',
            padding: '20px',
            overflow: 'hidden'
          }}>
            <div style={{
              ...getViewportStyle(),
              overflow: 'auto', // Прокрутка сохраняется
              scrollbarWidth: 'none', // Скрываем полосу в Firefox
              msOverflowStyle: 'none', // Скрываем полосу в IE/Edge
            }}>
              <style>{`
                div[style*="overflow: auto"]::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              <iframe
                key={iframeKey}
                ref={iframeRef}
                srcDoc={srcDoc}
                title="preview"
                sandbox="allow-scripts allow-same-origin allow-forms"
                width="100%"
                height="100%"
                style={{
                  border: viewportSize === 'desktop' ? 'none' : '2px solid #ddd',
                  borderRadius: viewportSize === 'mobile' ? '30px' : viewportSize === 'tablet' ? '20px' : '0',
                  boxShadow: viewportSize !== 'desktop' ? '0 10px 25px rgba(0,0,0,0.1)' : 'none',
                  backgroundColor: 'white',
                  overflow: 'hidden' // Запрещаем прокрутку в iframe
                }}
              />
            </div>
          </div>
        </div>

        <div className="editor-section">
          <div className="editor-header">
            <div className="editor-tabs">
              {(['html', 'css', 'js'] as const).map((tab) => (
                <button
                  key={tab}
                  className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="save-buttons">
              <div className={`save-status ${saveStatus}`}>
                {saveStatus === 'saving' ? 'Сохранение...' :
                 saveStatus === 'saved' ? 'Сохранено!' : ''}
              </div>
              <ImageUploader
                projectId={id}
                onImageUploaded={() => {}}
                onInsertImage={(url) => {
                  if (activeTab === 'html' && editorRef.current) {
                    const imgTag = `<img src="${url}" alt="Uploaded image" />`;
                    insertTextAtCursor(imgTag);
                  }
                }}
              />
              <button className="save-btn zip" onClick={handleSaveToZip}>
                Сохранить в ZIP
              </button>
            </div>
          </div>

          <div className="editor-content">
            <Editor
              height="100%"
              width="100%"
              language={activeTab}
              value={code[activeTab]}
              onChange={(value) => handleEditorChange(value, activeTab)}
              onMount={(editor) => {
                editorRef.current = editor;
              }}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                scrollBeyondLastLine: false,
                automaticLayout: true
              }}
            />
          </div>
        </div>
      </div>

      {showGithubModal && (
        <GithubSetup
          onSave={handleGithubSave}
          onClose={() => setShowGithubModal(false)}
          initialToken={githubToken || undefined}
          initialRepo={githubRepo || undefined}
        />
      )}
    </div>
  );
};

export default EditProject;
