import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Logo from '../components/logo/Logo';
import Editor from '@monaco-editor/react';
import '../style/DevArea/DevArea.css';

interface ProjectData {
  id: number;
  name: string;
  html: string;
  css: string;
  js: string;
  ownerType: string;
  ownerId: number;
  created_at: string;
  updated_at: string;
}

type ViewportSize = 'desktop' | 'tablet' | 'mobile';
type CodeTab = 'html' | 'css' | 'js';

const VIEWPORT_SIZES = {
  desktop: { width: '100%', height: '100%', label: 'Десктоп' },
  tablet: { width: '768px', height: '1024px', label: 'Планшет' },
  mobile: { width: '375px', height: '667px', label: 'Мобильный' }
};

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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
    </style>
  `;

  const anchorHandler = `
    <script>
      (function() {
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

        function handleLinkClick(e) {
          const link = e.target.closest('a');
          if (!link) return;

          const href = link.getAttribute('href');

          if (!href || href === '#') {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }

          if (href.startsWith('#')) {
            e.preventDefault();
            e.stopPropagation();
            const hash = href;
            scrollToAnchor(hash);
            if (window.location.hash !== hash) {
              history.replaceState(null, '', hash);
            }
            return false;
          }

          if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
            e.preventDefault();
            e.stopPropagation();
            window.open(href, '_blank');
            return false;
          }

          e.preventDefault();
          e.stopPropagation();
          console.log('Navigation blocked in preview mode:', href);
          return false;
        }

        document.addEventListener('click', handleLinkClick, true);

        if (window.location.hash) {
          setTimeout(() => {
            scrollToAnchor(window.location.hash);
          }, 100);
        }

        window.addEventListener('hashchange', function(e) {
          e.preventDefault();
          scrollToAnchor(window.location.hash);
        });

        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function(state, title, url) {
          if (typeof url === 'string' && url.startsWith('#')) {
            scrollToAnchor(url);
            originalReplaceState.call(this, state, title, url);
            return;
          }
          originalReplaceState.call(this, state, title, window.location.pathname + window.location.search + (window.location.hash || ''));
        };

        history.replaceState = function(state, title, url) {
          if (typeof url === 'string' && url.startsWith('#')) {
            scrollToAnchor(url);
            originalReplaceState.call(this, state, title, url);
            return;
          }
          originalReplaceState.call(this, state, title, window.location.pathname + window.location.search + (window.location.hash || ''));
        };

        const originalOpen = window.open;
        window.open = function(url, name, features) {
          if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
            return originalOpen.call(window, url, '_blank', features);
          }
          console.log('Window.open blocked:', url);
          return null;
        };

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
      * {
        box-sizing: border-box;
        max-width: 100%;
      }
      img {
        max-width: 100%;
        height: auto;
      }
      ${css}
    </style>
    ${anchorHandler}
  </head>
  <body>
    ${html}
    <script>
      try {
        ${js}
      } catch (error) {
        console.error('Error in user script:', error);
      }
    </script>
  </body>
</html>
  `;
};

const ViewProject = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [srcDoc, setSrcDoc] = useState('');
  const [viewportSize, setViewportSize] = useState<ViewportSize>('desktop');
  const [showCode, setShowCode] = useState(false);
  const [activeTab, setActiveTab] = useState<CodeTab>('html');

  const getMonacoLanguage = (tab: string): string => {
    switch(tab) {
      case 'html': return 'html';
      case 'css': return 'css';
      case 'js': return 'javascript';
      default: return 'plaintext';
    }
  };

  const getViewportStyle = (): React.CSSProperties => {
    const size = VIEWPORT_SIZES[viewportSize];
    return {
      maxWidth: size.width,
      width: viewportSize === 'desktop' ? '100%' : size.width,
      height: viewportSize === 'desktop' ? '100%' : size.height,
      margin: '0 auto',
      transition: 'all 0.3s ease',
      overflow: 'auto',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none'
    };
  };

  useEffect(() => {
    const loadProject = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_URL}/api/projects/public/${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load project');
        }

        if (!data.project) {
          throw new Error('Project not found');
        }

        const projectData: ProjectData = {
          id: data.project.id,
          name: data.project.name,
          html: data.project.html || '',
          css: data.project.css || '',
          js: data.project.js || '',
          ownerType: data.project.owner_type,
          ownerId: data.project.owner_id,
          created_at: data.project.created_at,
          updated_at: data.project.updated_at
        };

        setProject(projectData);

        const isolatedHtml = createIsolatedHTML(
          projectData.html,
          projectData.css,
          projectData.js
        );
        setSrcDoc(isolatedHtml);
      } catch (err) {
        console.error('Error loading project:', err);
        setError(err instanceof Error ? err.message : 'Failed to load project');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadProject();
    }
  }, [id]);

  // Добавляем глобальные стили для скрытия полос прокрутки
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      div[style*="overflow: auto"]::-webkit-scrollbar {
        display: none;
      }
      div[style*="overflow: auto"] {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      .view-only-editor {
        opacity: 0.9;
      }
      .view-only-editor .monaco-editor .scroll-decoration {
        box-shadow: none !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (loading) {
    return (
      <div className="dev-area">
        <header className='headerPanelDev'>
          <Logo createSitePath=''/>
          <h2 className="project-title">Загрузка проекта...</h2>
        </header>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Загрузка проекта...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="dev-area">
        <header className='headerPanelDev'>
          <Logo createSitePath=''/>
          <h2 className="project-title">Ошибка</h2>
        </header>
        <div className="error-container" style={{ textAlign: 'center', padding: '50px' }}>
          <p style={{ color: '#e74c3c', fontSize: '18px' }}>{error || 'Проект не найден'}</p>
          <button
            onClick={() => navigate('/')}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              background: '#b9ff66',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            На главную
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dev-area">
      <header className='headerPanelDev'>
        <Logo createSitePath=''/>
        <h2 className="project-title">Просмотр: {project.name}</h2>
        <div className="header-actions">
          <button
            onClick={() => setShowCode(!showCode)}
            className={`code-toggle-btn ${showCode ? 'active' : ''}`}
            title={showCode ? 'Скрыть код' : 'Показать код'}
          >
            {showCode ? 'Скрыть код' : 'Показать код'}
          </button>
          <div className="view-only-badge">
            Режим просмотра
          </div>
          <button
            onClick={() => navigate('/')}
            className="home-btn"
          >
            На главную
          </button>
        </div>
      </header>

      <div className="viewport-controls">
        <div className="viewport-selector">
          <button
            className={`viewport-btn desktop ${viewportSize === 'desktop' ? 'active' : ''}`}
            onClick={() => setViewportSize('desktop')}
            title="Десктоп"
          >
            Десктоп
          </button>
          <button
            className={`viewport-btn tablet ${viewportSize === 'tablet' ? 'active' : ''}`}
            onClick={() => setViewportSize('tablet')}
            title="Планшет"
          >
            Планшет
          </button>
          <button
            className={`viewport-btn mobile ${viewportSize === 'mobile' ? 'active' : ''}`}
            onClick={() => setViewportSize('mobile')}
            title="Мобильный"
          >
            Мобильный
          </button>
        </div>
      </div>

      <div className="main-content" style={{ height: showCode ? 'calc(100vh - 135px)' : 'calc(100vh - 95px)' }}>
        <div className="preview-section" style={{ width: showCode ? '60%' : '100%', transition: 'width 0.3s ease' }}>
          <div className="preview-container" style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            backgroundColor: '#f0f0f0',
            height: '100%',
            padding: '20px',
            overflow: 'hidden'
          }}>
            <div style={getViewportStyle()}>
              <iframe
                srcDoc={srcDoc}
                title="preview"
                sandbox="allow-same-origin allow-scripts allow-forms allow-modals allow-popups"
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

        {showCode && (
          <div className="editor-section view-only-editor">
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
              <div className="readonly-badge">
                Только просмотр
              </div>
            </div>

            <div className="editor-content">
              <Editor
                height="100%"
                width="100%"
                language={getMonacoLanguage(activeTab)}
                value={activeTab === 'html' ? project.html : activeTab === 'css' ? project.css : project.js}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 14,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  wordWrap: 'on',
                  lineNumbers: 'on',
                  folding: true,
                  renderWhitespace: 'selection',
                  scrollbar: {
                    vertical: 'visible',
                    horizontal: 'visible',
                    verticalScrollbarSize: 10,
                    horizontalScrollbarSize: 10,
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewProject;
