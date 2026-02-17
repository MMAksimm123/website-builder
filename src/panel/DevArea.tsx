import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { supabase } from '../database/supabaseClient';
import '../style/DevArea/DevArea.css';
import { loadTemplateFiles } from '../utils/loadTemplate';
import Logo from '../components/logo/Logo';
import LogoutButton from '../components/LogoutButton/LogoutButton';
import ImageUploader from '../components/ImageUploader/ImageUploader';

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

const DevArea = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js'>('html');
  const [code, setCode] = useState(DEFAULT_TEMPLATE);
  const [srcDoc, setSrcDoc] = useState('');
  const [userId, setUserId] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [viewportSize, setViewportSize] = useState<ViewportSize>('desktop');
  const [templateName, setTemplateName] = useState<string>('Новый проект');
  const [iframeKey, setIframeKey] = useState(Date.now());

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

  // Обновление iframe с изолированным контентом
  const updateIframeContent = useCallback(() => {
    const isolatedHtml = createIsolatedHTML(code.html, code.css, code.js);
    setSrcDoc(isolatedHtml);
    setIframeKey(Date.now()); // Обновляем ключ для перезагрузки iframe
  }, [code]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      setUserId(user.id);

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

  // Обновляем iframe при изменении кода с debounce
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
      const { data, error } = await supabase
        .from('user_projects')
        .insert({
          user_id: userId,
          name: projectName,
          html: code.html,
          css: code.css,
          js: code.js,
          updated_at: new Date()
        })
        .select()
        .single();

      if (error) throw error;

      setSaveStatus('saved');
      setTimeout(() => navigate(`/edit/${data.id}`), 1000);
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('idle');
    }
  }, [code, userId, navigate, templateName]);

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

  return (
    <div className="dev-area">
      <header className='headerPanelDev'>
        <Logo createSitePath='main'/>
        <h2 className="project-title">{templateName}</h2>
        <LogoutButton />
      </header>

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
              // Скрываем полосу в Chrome/Safari через псевдоэлемент
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
              <button
                className="save-btn cloud"
                onClick={handleSaveToCloud}
                disabled={saveStatus === 'saving'}
              >
                {saveStatus === 'saving' ? 'Сохранение...' : 'Сохранить проект'}
              </button>
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
    </div>
  );
};

export default DevArea;
