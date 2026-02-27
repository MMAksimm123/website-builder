import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import '../style/DevArea/DevArea.css';
import { loadTemplateFiles } from '../utils/loadTemplate';
import Logo from '../components/logo/Logo';
import LogoutButton from '../components/LogoutButton/LogoutButton';
import ImageUploader from '../components/ImageUploader/ImageUploader';
import GithubSetup from '../components/GithubSetup/GithubSetup';
import GitHubClient from '../utils/github';
import { api } from '../services/api';

const DEFAULT_TEMPLATE = {
  html: '<!DOCTYPE html><html><head><title>New Project</title></head><body><h1>New Project</h1></body></html>',
  css: 'body { font-family: Arial; }',
  js: 'console.log("Hello world");'
};

type ViewportSize = 'desktop' | 'tablet' | 'mobile';

const VIEWPORT_SIZES = {
  desktop: { width: '100%', height: '100%', label: 'Десктоп' },
  tablet: { width: '768px', height: '1024px', label: 'Планшет' },
  mobile: { width: '375px', height: '667px', label: 'Мобильный' }
};

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
        document.addEventListener('click', function(e) {
          const link = e.target.closest('a');
          if (!link || !link.hash) return;
          if (link.hash.startsWith('#')) {
            e.preventDefault();
            const hash = link.hash;
            scrollToAnchor(hash);
            if (window.location.hash !== hash) {
              history.replaceState(null, '', hash);
            }
            console.log('Anchor navigation:', hash);
            return false;
          }
        });
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
          console.log('Navigation prevented in preview mode');
          originalReplaceState.call(this, state, title, window.location.pathname + window.location.search + (window.location.hash || ''));
        };
        history.replaceState = function(state, title, url) {
          if (typeof url === 'string' && url.startsWith('#')) {
            scrollToAnchor(url);
            originalReplaceState.call(this, state, title, url);
            return;
          }
          console.log('Navigation prevented in preview mode');
          originalReplaceState.call(this, state, title, window.location.pathname + window.location.search + (window.location.hash || ''));
        };
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
    <base href="/">
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
      ${js}
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

const DevArea = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js'>('html');
  const [code, setCode] = useState(DEFAULT_TEMPLATE);
  const [srcDoc, setSrcDoc] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [viewportSize, setViewportSize] = useState<ViewportSize>('desktop');
  const [templateName, setTemplateName] = useState<string>('Новый проект');
  const [iframeKey, setIframeKey] = useState(Date.now());
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [githubStatus, setGithubStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [githubError, setGithubError] = useState('');
  const [githubRepo, setGithubRepo] = useState<string | null>(null);
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);

  const editorRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
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

  const handleImageUploaded = (image: { id: string; url: string; name: string }) => {
    console.log('Image uploaded:', image);
  };

  const handleInsertImage = (url: string) => {
    if (activeTab === 'html') {
      const imgTag = `<img src="${url}" alt="Uploaded image" />`;
      insertTextAtCursor(imgTag);
    }
  };

  const updateIframeContent = useCallback(() => {
    const isolatedHtml = createIsolatedHTML(code.html, code.css, code.js);
    setSrcDoc(isolatedHtml);
    setIframeKey(Date.now());
  }, [code]);

  useEffect(() => {
    const init = async () => {
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

      const state = location.state as { templateKey?: string; templateId?: number } | null;

      if (state?.templateKey) {
        const savedTemplate = sessionStorage.getItem(state.templateKey);
        if (savedTemplate) {
          try {
            const templateData = JSON.parse(savedTemplate);
            setCode({
              html: templateData.html || '',
              css: templateData.css || '',
              js: templateData.js || ''
            });
            setTemplateName(templateData.name || `Шаблон ${state.templateId}`);
            sessionStorage.removeItem(state.templateKey);
          } catch (error) {
            console.error('Error loading template:', error);
          }
        }
      } else {
        const template = await loadTemplateFiles(1);
        if (template) {
          setCode(template);
        }
      }
    };

    init();
  }, [location.state, navigate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      updateIframeContent();
    }, 250);

    return () => clearTimeout(timer);
  }, [code, updateIframeContent]);

  const handleSaveToCloud = useCallback(async () => {
    const projectName = prompt('Название проекта:', templateName);
    if (!projectName) return;

    setSaveStatus('saving');
    try {
      const { data, error } = await api.createProject(
        projectName,
        code.html,
        code.css,
        code.js
      );

      if (error) throw new Error(error);
      if (!data?.project) throw new Error('No project data received');

      setProjectId(data.project.id);
      setSaveStatus('saved');
      setTimeout(() => navigate(`/edit/${data.project.id}`), 1000);
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('idle');
    }
  }, [code, navigate, templateName]);

  const handleSaveToZip = useCallback(() => {
    const zip = new JSZip();
    zip.file("index.html", code.html);
    zip.file("style.css", code.css);
    zip.file("script.js", code.js);
    zip.generateAsync({ type: "blob" }).then((content) => {
      saveAs(content, `${templateName.replace(/\s+/g, '_')}.zip`);
    });
  }, [code, templateName]);

  const handleEditorChange = (value: string | undefined, language: 'html' | 'css' | 'js') => {
    if (value !== undefined) {
      setCode(prev => ({ ...prev, [language]: value }));
    }
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

  const handleGithubSave = async (config: { token: string; repo: string; isPrivate: boolean }) => {
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

      await client.uploadProject(code, `Обновление: ${templateName}`);
      const repoUrl = await client.getRepoUrl();

      setGithubToken(config.token);
      setGithubRepo(config.repo);
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

  return (
    <div className="dev-area">
      <header className='headerPanelDev'>
        <Logo createSitePath='main'/>
        <h2 className="project-title">{templateName}</h2>
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
                sandbox="allow-scripts allow-same-origin allow-forms"
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
              <button
                className="save-btn cloud"
                onClick={handleSaveToCloud}
                disabled={saveStatus === 'saving'}
              >
                {saveStatus === 'saving' ? 'Сохранение...' : 'Сохранить проект в облако'}
              </button>
              <button className="save-btn zip" onClick={handleSaveToZip}>
                Сохранить в ZIP
              </button>
              <ImageUploader
                onImageUploaded={handleImageUploaded}
                onInsertImage={handleInsertImage}
              />
            </div>
          </div>

          <div className="editor-content">
            <Editor
              height="100%"
              width="100%"
              language={activeTab}
              value={code[activeTab]}
              onChange={(value) => handleEditorChange(value, activeTab)}
              onMount={handleEditorDidMount}
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

export default DevArea;
