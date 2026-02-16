import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { supabase } from '../database/supabaseClient';
import '../style/DevArea/DevArea.css';
import Logo from '../components/logo/Logo';
import LogoutButton from '../components/LogoutButton/LogoutButton';
import ImageUploader from '../components/ImageUploader/ImageUploader';

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

// Функция для создания HTML с изолированной обработкой якорных ссылок
const createIsolatedHTML = (html: string, css: string, js: string) => {
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

  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js'>('html');
  const [code, setCode] = useState<TemplateFiles>({ html: '', css: '', js: '' });
  const [srcDoc, setSrcDoc] = useState('');
  const [projectName, setProjectName] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [viewportSize, setViewportSize] = useState<ViewportSize>('desktop');
  const [iframeKey, setIframeKey] = useState(Date.now());

  const editorRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  let saveTimer: NodeJS.Timeout;

  // Обновление iframe с изолированным контентом
  const updateIframeContent = useCallback(() => {
    const isolatedHtml = createIsolatedHTML(code.html, code.css, code.js);
    setSrcDoc(isolatedHtml);
    setIframeKey(Date.now()); // Обновляем ключ для перезагрузки iframe
  }, [code]);

  useEffect(() => {
    const loadProject = async () => {
      try {
        const state = location.state as { initialCode?: TemplateFiles } | null;

        if (state?.initialCode) {
          setCode(state.initialCode);
          setProjectName('Новый проект из шаблона');
          return;
        }

        if (id) {
          const { data } = await supabase
            .from('user_projects')
            .select('html, css, js, name')
            .eq('id', id)
            .single();

          if (data) {
            const projectData = {
              html: data.html || '',
              css: data.css || '',
              js: data.js || ''
            };
            setCode(projectData);
            setProjectName(data.name || `Проект ${id}`);
          }
        }
      } catch (error) {
        console.error('Project loading error:', error);
      }
    };

    loadProject();
  }, [id, location.state]);

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
      transition: 'all 0.3s ease',
      overflow: 'auto'
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

  return (
    <div className="dev-area">
      <header className='headerPanelDev'>
        <Logo createSitePath='main'/>
        <h2 className="project-title">Редактирование: {projectName}</h2>
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
            overflow: 'auto'
          }}>
            <div style={getViewportStyle()}>
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
                  backgroundColor: 'white'
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
    </div>
  );
};

export default EditProject;
