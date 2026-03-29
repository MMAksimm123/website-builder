import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import '../style/DevArea/DevArea.css';
import Logo from '../components/logo/Logo';
import LogoutButton from '../components/LogoutButton/LogoutButton';
import ImageUploader from '../components/ImageUploader/ImageUploader';
import GithubSetup from '../components/GithubSetup/GithubSetup';
import GitHubClient from '../utils/github';
import { api } from '../services/api';

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

const createIsolatedHTML = (html: string, css: string, js: string) => {
  const hideScrollbarStyles = `
    <style>
      html {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      html::-webkit-scrollbar {
        display: none;
      }
      body {
        overflow: auto;
        -webkit-overflow-scrolling: touch;
      }
      * {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      *::-webkit-scrollbar {
        display: none;
      }

      /* Базовые стили для iframe */
      iframe {
        border: none;
      }
    </style>
  `;

  // Улучшенный скрипт для полной изоляции ссылок и предотвращения навигации
  const anchorHandler = `
    <script>
      (function() {
        // Функция для прокрутки к элементу по якорю
        function scrollToAnchor(hash) {
          if (!hash || hash === '#') return;
          const targetId = hash.substring(1);
          const targetElement = document.getElementById(targetId);
          if (targetElement) {
            targetElement.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
          }
        }

        // Полная изоляция всех ссылок
        function handleLinkClick(e) {
          const link = e.target.closest('a');
          if (!link) return;

          const href = link.getAttribute('href');

          // Если ссылка пустая или просто '#'
          if (!href || href === '#') {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }

          // Если ссылка - якорь (начинается с #)
          if (href.startsWith('#')) {
            e.preventDefault();
            e.stopPropagation();
            const hash = href;
            scrollToAnchor(hash);
            // Обновляем хеш в URL iframe без перезагрузки
            if (window.location.hash !== hash) {
              history.replaceState(null, '', hash);
            }
            return false;
          }

          // Если ссылка ведет на другой сайт - открываем в новой вкладке
          if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
            e.preventDefault();
            e.stopPropagation();
            window.open(href, '_blank');
            return false;
          }

          // Для всех остальных ссылок (относительные пути) - блокируем навигацию
          e.preventDefault();
          e.stopPropagation();
          console.log('Navigation blocked in preview mode:', href);
          return false;
        }

        // Перехватываем все клики на ссылки
        document.addEventListener('click', handleLinkClick, true);

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

        // Блокируем все попытки навигации через history API
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function(state, title, url) {
          // Разрешаем только изменение хеша
          if (typeof url === 'string' && url.startsWith('#')) {
            scrollToAnchor(url);
            originalReplaceState.call(this, state, title, url);
            return;
          }

          // Блокируем любую другую навигацию
          console.log('Navigation blocked (pushState):', url);
          originalReplaceState.call(this, state, title, window.location.pathname + window.location.search + (window.location.hash || ''));
        };

        history.replaceState = function(state, title, url) {
          // Разрешаем только изменение хеша
          if (typeof url === 'string' && url.startsWith('#')) {
            scrollToAnchor(url);
            originalReplaceState.call(this, state, title, url);
            return;
          }

          // Блокируем любую другую навигацию
          console.log('Navigation blocked (replaceState):', url);
          originalReplaceState.call(this, state, title, window.location.pathname + window.location.search + (window.location.hash || ''));
        };

        // Блокируем переходы по ссылкам через атрибуты target
        const originalOpen = window.open;
        window.open = function(url, name, features) {
          if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
            return originalOpen.call(window, url, '_blank', features);
          }
          console.log('Window.open blocked:', url);
          return null;
        };

        // Блокируем переходы через location
        const originalLocationHref = Object.getOwnPropertyDescriptor(window.location, 'href');
        Object.defineProperty(window.location, 'href', {
          set: function(value) {
            if (value && (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('//'))) {
              console.log('Location.href redirect blocked:', value);
              return;
            }
            console.log('Location.href blocked:', value);
          },
          get: function() {
            return originalLocationHref?.get.call(window.location) || '';
          }
        });

        console.log('Anchor links isolation enabled for preview iframe');
      })();
    </script>
  `;

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <base target="_self">
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
      try {
        ${js}
      } catch (error) {
        console.error('Error in user script:', error);
      }

      // Дополнительный код для совместимости
      (function() {
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
  const [isLoading, setIsLoading] = useState(true);
  const [editorKey, setEditorKey] = useState(Date.now());

  const editorRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  let saveTimer: NodeJS.Timeout;

  // Функция для получения правильного языка для Monaco
  const getMonacoLanguage = (tab: string): string => {
    switch(tab) {
      case 'html': return 'html';
      case 'css': return 'css';
      case 'js': return 'javascript';
      default: return 'plaintext';
    }
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    // Принудительно устанавливаем язык
    const model = editor.getModel();
    if (model) {
      monaco.editor.setModelLanguage(model, getMonacoLanguage(activeTab));
    }

    // Настройка подсветки JavaScript
    if (monaco.languages?.typescript?.javascriptDefaults) {
      monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        allowNonTsExtensions: true,
      });
    }
  };

  useEffect(() => {
  const handleIframeMessages = (event: MessageEvent) => {
    // Получаем сообщения из iframe
    if (event.data?.type === 'console') {
      console.log(`[Iframe] ${event.data.level}:`, event.data.args);
    }
  };

  window.addEventListener('message', handleIframeMessages);

  return () => {
    window.removeEventListener('message', handleIframeMessages);
  };
}, []);

  // Обновляем язык при смене вкладки
  useEffect(() => {
    if (editorRef.current) {
      const monaco = (window as any).monaco;
      if (monaco) {
        const model = editorRef.current.getModel();
        if (model) {
          monaco.editor.setModelLanguage(model, getMonacoLanguage(activeTab));
        }
      }
    }
  }, [activeTab]);

  // Добавляем глобальные стили для подсказок
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .monaco-editor .suggest-widget,
      .monaco-editor .suggest-widget * {
        color: #333333 !important;
        background-color: #ffffff !important;
      }
      .monaco-editor .suggest-widget .monaco-list .monaco-list-row.focused {
        background-color: #b9ff66 !important;
        color: #000000 !important;
      }
      .monaco-editor .suggest-widget .monaco-list .monaco-list-row.focused * {
        color: #000000 !important;
      }
      .monaco-editor .token.keyword { color: #0000FF !important; }
      .monaco-editor .token.string { color: #A31515 !important; }
      .monaco-editor .token.comment { color: #008000 !important; }
      .monaco-editor .token.number { color: #098658 !important; }
      .monaco-editor .token.operator { color: #000000 !important; }
      .monaco-editor .token.function { color: #795E26 !important; }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const updateIframeContent = useCallback(() => {
    const isolatedHtml = createIsolatedHTML(code.html, code.css, code.js);
    setSrcDoc(isolatedHtml);
    setIframeKey(Date.now());
  }, [code]);

  useEffect(() => {
    const loadProject = async () => {
      setIsLoading(true);
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

        if (!id) {
          navigate('/main');
          return;
        }

        const { data, error } = await api.getProject(id);

        if (error) throw new Error(error);
        if (!data?.project) throw new Error('Project not found');

        const project = data.project;
        setCode({
          html: project.html || '',
          css: project.css || '',
          js: project.js || ''
        });
        setProjectName(project.name || `Проект ${id}`);

        if (project.github_repo) {
          setGithubRepo(project.github_repo);
        }
      } catch (error) {
        console.error('Project loading error:', error);
        navigate('/main');
      } finally {
        setIsLoading(false);
      }
    };

    loadProject();
  }, [id, navigate]);

  const saveProject = useCallback(async (currentCode: TemplateFiles) => {
    if (!id || !AUTO_SAVE_ENABLED) return;

    setSaveStatus('saving');
    clearTimeout(saveTimer);

    try {
      const { error } = await api.updateProject(id, currentCode);
      if (!error) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('idle');
    }
  }, [id]);

  const handleEditorChange = (value: string | undefined) => {
    if (value === undefined) return;

    const newCode = { ...code, [activeTab]: value };
    setCode(newCode);

    if (AUTO_SAVE_ENABLED && id) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => saveProject(newCode), SAVE_DEBOUNCE_DELAY);
    }
  };

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
      const exists = await client.checkRepoExists();

      if (!exists) {
        const repoName = config.repo.split('/')[1];
        await client.createRepo(repoName, config.isPrivate);
      }

      await client.uploadProject(code, `Обновление: ${projectName}`);
      const repoUrl = await client.getRepoUrl();

      const { error } = await api.saveGithubSettings(id, config.repo, config.token);
      if (error) throw new Error(error);

      setGithubRepo(config.repo);
      setGithubToken(config.token);
      setGithubStatus('success');

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
              overflow: 'auto',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
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
                sandbox="llow-same-origin allow-scripts allow-forms allow-modals allow-popups"
                width="100%"
                height="100%"
                style={{
                  border: viewportSize === 'desktop' ? 'none' : '2px solid #ddd',
                  borderRadius: viewportSize === 'mobile' ? '30px' : viewportSize === 'tablet' ? '20px' : '0',
                  boxShadow: viewportSize !== 'desktop' ? '0 10px 25px rgba(0,0,0,0.1)' : 'none',
                  backgroundColor: 'white',
                  overflow: 'hidden'
                }}
              />
            </div>
          </div>
        </div>

        <div className="editor-section">
          <div className="editor-header">
            <div className="editor-tabs">
              <button
                className={`tab-btn ${activeTab === 'html' ? 'active' : ''}`}
                onClick={() => setActiveTab('html')}
              >
                HTML
              </button>
              <button
                className={`tab-btn ${activeTab === 'css' ? 'active' : ''}`}
                onClick={() => setActiveTab('css')}
              >
                CSS
              </button>
              <button
                className={`tab-btn ${activeTab === 'js' ? 'active' : ''}`}
                onClick={() => setActiveTab('js')}
              >
                JS
              </button>
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
              key={editorKey}
              height="100%"
              width="100%"
              language={getMonacoLanguage(activeTab)}
              value={code[activeTab]}
              onChange={handleEditorChange}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordBasedSuggestions: 'off',
                suggestOnTriggerCharacters: true,
                quickSuggestions: {
                  other: 'on',
                  comments: 'on',
                  strings: 'on'
                },
                parameterHints: {
                  enabled: true
                },
                formatOnPaste: true,
                formatOnType: true,
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
