import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { supabase } from '../database/supabaseClient';

interface TemplateFiles {
  html: string;
  css: string;
  js: string;
}

const DevArea = () => {
  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js'>('html');
  const [code, setCode] = useState<TemplateFiles>({
    html: '',
    css: '',
    js: ''
  });
  const [srcDoc, setSrcDoc] = useState<string>('');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Получаем текущего пользователя
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  // Загрузка данных
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      try {
        // Пытаемся загрузить сохраненный проект пользователя
        if (userId) {
          const { data, error } = await supabase
            .from('user_projects')
            .select('html, css, js')
            .eq('user_id', userId)
            .single();

          if (!error && data) {
            setCode({
              html: data.html || '',
              css: data.css || '',
              js: data.js || ''
            });
            setLoading(false);
            return;
          }
        }

        // Загружаем шаблоны
        const [html, css, js] = await Promise.all([
          fetch('/examples/example1/index.html').then(r => r.text()),
          fetch('/examples/example1/style.css').then(r => r.text()),
          fetch('/examples/example1/index.js').then(r => r.text())
        ]);

        setCode({ html, css, js });
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId !== null) {
      loadData();
    }
  }, [userId]);

  // Обновление iframe
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSrcDoc(`
        <html>
          <head>
            <style>${code.css}</style>
          </head>
          <body>
            ${code.html}
            <script>${code.js}</script>
          </body>
        </html>
      `);
    }, 250);

    return () => clearTimeout(timeout);
  }, [code.html, code.css, code.js]);

  const handleEditorChange = (value: string | undefined, language: 'html' | 'css' | 'js') => {
    if (value !== undefined) {
      setCode(prev => ({
        ...prev,
        [language]: value
      }));
    }
  };

  const handleSaveToCloud = async () => {
    if (!userId) {
      setSaveMessage('Ошибка: Пользователь не авторизован');
      return;
    }

    setIsSaving(true);
    setSaveMessage('Сохранение...');

    try {
      const { error } = await supabase
        .from('user_projects')
        .upsert({
          user_id: userId,
          html: code.html,
          css: code.css,
          js: code.js,
          updated_at: new Date()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setSaveMessage('Успешно сохранено в облаке!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving project:', error);
      setSaveMessage('Ошибка при сохранении');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveToZip = () => {
    const zip = new JSZip();
    zip.file("index.html", code.html);
    zip.file("styles.css", code.css);
    zip.file("script.js", code.js);

    zip.generateAsync({ type: "blob" })
      .then((content) => {
        saveAs(content, "project.zip");
      });
  };

  if (loading) {
    return <div>Загрузка...</div>;
  }

  return (
    <div className="dev-area">
      <div className="preview-pane">
        <iframe
          srcDoc={srcDoc}
          title="preview"
          sandbox="allow-scripts"
          width="100%"
          height="400px"
        />
      </div>

      <div className="editor-container">
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
              JavaScript
            </button>
          </div>

          <div className="save-buttons">
            <button
              className="save-btn cloud"
              onClick={handleSaveToCloud}
              disabled={isSaving}
            >
              {isSaving ? 'Сохранение...' : 'Сохранить в облаке'}
            </button>
            <button
              className="save-btn zip"
              onClick={handleSaveToZip}
            >
              Сохранить в ZIP
            </button>
            {saveMessage && <span className="save-message">{saveMessage}</span>}
          </div>
        </div>

        <div className="editor-content">
          {activeTab === 'html' && (
            <Editor
              height="400px"
              language="html"
              value={code.html}
              onChange={(value) => handleEditorChange(value, 'html')}
            />
          )}
          {activeTab === 'css' && (
            <Editor
              height="400px"
              language="css"
              value={code.css}
              onChange={(value) => handleEditorChange(value, 'css')}
            />
          )}
          {activeTab === 'js' && (
            <Editor
              height="400px"
              language="javascript"
              value={code.js}
              onChange={(value) => handleEditorChange(value, 'js')}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default DevArea;
