// EditProject.tsx
import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { supabase } from '../database/supabaseClient';

interface TemplateFiles {
  html: string;
  css: string;
  js: string;
}

const EditProject = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js'>('html');
  const [code, setCode] = useState<TemplateFiles>({
    html: '',
    css: '',
    js: ''
  });
  const [originalCode, setOriginalCode] = useState<TemplateFiles>({
    html: '',
    css: '',
    js: ''
  });
  const [srcDoc, setSrcDoc] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [projectName, setProjectName] = useState('');

  useEffect(() => {
    const loadProject = async () => {
      try {
        // Если есть переданные данные из UserProjects
        if (location.state?.initialCode) {
          setCode(location.state.initialCode);
          setOriginalCode(location.state.initialCode);
          setLoading(false);
          return;
        }

        // Загружаем проект из базы данных
        const { data, error } = await supabase
          .from('user_projects')
          .select('html, css, js, name')
          .eq('id', id)
          .single();

        if (error) throw error;

        const projectData = {
          html: data.html || '',
          css: data.css || '',
          js: data.js || ''
        };

        setCode(projectData);
        setOriginalCode(projectData);
        setProjectName(data.name || `Проект ${id}`);
        setLoading(false);
      } catch (error) {
        console.error('Error loading project:', error);
        setLoading(false);
      }
    };

    if (id) {
      loadProject();
    }
  }, [id, location.state]);

  useEffect(() => {
    const changesExist =
      code.html !== originalCode.html ||
      code.css !== originalCode.css ||
      code.js !== originalCode.js;
    setHasChanges(changesExist);
  }, [code, originalCode]);

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
    if (!id) return;

    setIsSaving(true);
    setSaveMessage('Сохранение...');

    try {
      const { error } = await supabase
        .from('user_projects')
        .update({
          html: code.html,
          css: code.css,
          js: code.js,
          updated_at: new Date()
        })
        .eq('id', id);

      if (error) throw error;

      // Обновляем originalCode после успешного сохранения
      setOriginalCode(code);
      setHasChanges(false);
      setSaveMessage('Успешно сохранено!');
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
    zip.file("style.css", code.css);
    zip.file("script.js", code.js);

    zip.generateAsync({ type: "blob" })
      .then((content) => {
        saveAs(content, `${projectName || 'project'}.zip`);
      });
  };

  if (loading) {
    return <div className="loading-message">Загрузка проекта...</div>;
  }

  return (
    <div className="dev-area">
      <h2>Редактирование: {projectName}</h2>
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
              className={`save-btn cloud ${hasChanges ? 'has-changes' : ''}`}
              onClick={handleSaveToCloud}
              disabled={isSaving || !hasChanges}
            >
              {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
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

export default EditProject;
