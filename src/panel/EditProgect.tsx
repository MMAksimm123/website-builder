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
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <base href="/">
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

      /* Стили для модального окна alert */
      .custom-alert {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        z-index: 10000;
        min-width: 300px;
        max-width: 500px;
        font-family: Arial, sans-serif;
      }

      .custom-alert .message {
        margin-bottom: 20px;
        color: #333;
      }

      .custom-alert button {
        padding: 8px 16px;
        background: #b9ff66;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        float: right;
      }

      .custom-alert-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 9999;
      }
    </style>
  </head>
  <body>
    ${html}

    <script>
      (function() {
        // Сохраняем оригинальные методы
        const originalAddEventListener = EventTarget.prototype.addEventListener;

        // Перехватываем добавление обработчиков
        const handlers = [];

        EventTarget.prototype.addEventListener = function(type, handler, options) {
          handlers.push({ target: this, type, handler, options });
          return originalAddEventListener.call(this, type, handler, options);
        };

        // Эмуляция alert если заблокирован
        if (typeof window.alert !== 'function' || window.alert.toString().includes('sandbox')) {
          window.alert = function(message) {
            console.log('[Alert]', message);

            // Создаем overlay
            const overlay = document.createElement('div');
            overlay.className = 'custom-alert-overlay';

            // Создаем модальное окно
            const modal = document.createElement('div');
            modal.className = 'custom-alert';

            const messageDiv = document.createElement('div');
            messageDiv.className = 'message';
            messageDiv.textContent = message;

            const button = document.createElement('button');
            button.textContent = 'OK';
            button.onclick = function() {
              document.body.removeChild(overlay);
              document.body.removeChild(modal);
            };

            modal.appendChild(messageDiv);
            modal.appendChild(button);

            document.body.appendChild(overlay);
            document.body.appendChild(modal);
          };
        }

        // Эмуляция confirm
        if (typeof window.confirm !== 'function' || window.confirm.toString().includes('sandbox')) {
          window.confirm = function(message) {
            console.log('[Confirm]', message);
            return true; // Всегда возвращаем true для простоты
          };
        }

        // Эмуляция prompt
        if (typeof window.prompt !== 'function' || window.prompt.toString().includes('sandbox')) {
          window.prompt = function(message, defaultValue) {
            console.log('[Prompt]', message, defaultValue);
            return defaultValue || ''; // Возвращаем значение по умолчанию
          };
        }

        // Функция для выполнения пользовательского кода
        function executeUserScript() {
          try {
            // Выполняем пользовательский JS
            eval(${JSON.stringify(js)});

            // Вызываем готовые обработчики если есть
            if (typeof window.onload === 'function') {
              window.onload.call(window);
            }

            if (typeof document.onload === 'function') {
              document.onload.call(document);
            }

            console.log('✅ JavaScript выполнен успешно');
          } catch (error) {
            console.error('❌ Ошибка JavaScript:', error);

            // Показываем ошибку визуально
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = \`
              position: fixed;
              bottom: 20px;
              right: 20px;
              background: #ff4444;
              color: white;
              padding: 12px 20px;
              border-radius: 8px;
              font-family: monospace;
              font-size: 14px;
              z-index: 10000;
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
              max-width: 400px;
              word-wrap: break-word;
            \`;
            errorDiv.innerHTML = \`<strong>JavaScript Error:</strong> \${error.message}\`;
            document.body.appendChild(errorDiv);

            setTimeout(() => errorDiv.remove(), 5000);
          }
        }

        // Выполняем после загрузки DOM
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', executeUserScript);
        } else {
          executeUserScript();
        }
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
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-downloads"
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
