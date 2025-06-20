import { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { supabase } from '../database/supabaseClient';
//import '../style/EditProject/EditProject.css';
import '../style/DevArea/DevArea.css'

interface TemplateFiles {
  html: string;
  css: string;
  js: string;
}

const SAVE_DEBOUNCE_DELAY = 2000;
const AUTO_SAVE_ENABLED = true;

const EditProject = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js'>('html');
  const [code, setCode] = useState<TemplateFiles>({ html: '', css: '', js: '' });
  const [originalCode, setOriginalCode] = useState<TemplateFiles>({ html: '', css: '', js: '' });
  const [srcDoc, setSrcDoc] = useState('');
  const [projectName, setProjectName] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  let saveTimer: NodeJS.Timeout;

  // Загрузка проекта
  useEffect(() => {
    const loadProject = async () => {
      try {
        if (location.state?.initialCode) {
          setCode(location.state.initialCode);
          setOriginalCode(location.state.initialCode);
          return;
        }

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
          setOriginalCode(projectData);
          setProjectName(data.name || `Проект ${id}`);
        }
      } catch (error) {
        console.error('Project loading error:', error);
      }
    };

    if (id) loadProject();
  }, [id, location.state]);

  // Автосохранение при изменениях
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
        setOriginalCode(currentCode);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('idle');
    }
  }, [id]);

  // Обработчик изменений с дебаунсом
  const handleEditorChange = (value: string | undefined, language: 'html' | 'css' | 'js') => {
    if (value === undefined) return;

    const newCode = { ...code, [language]: value };
    setCode(newCode);

    if (AUTO_SAVE_ENABLED) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => saveProject(newCode), SAVE_DEBOUNCE_DELAY);
    }
  };

  // Генерация превью с дебаунсом
  useEffect(() => {
    const timer = setTimeout(() => {
      setSrcDoc(`
        <html>
          <head><style>${code.css}</style></head>
          <body>${code.html}<script>${code.js}</script></body>
        </html>
      `);
    }, 250);

    return () => clearTimeout(timer);
  }, [code]);

  // Сохранение в ZIP
  const handleSaveToZip = () => {
    const zip = new JSZip();
    zip.file("index.html", code.html);
    zip.file("style.css", code.css);
    zip.file("script.js", code.js);
    zip.generateAsync({ type: "blob" }).then(saveAs);
  };

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
            <button className="save-btn zip" onClick={handleSaveToZip}>
              Сохранить в ZIP
            </button>
            <div className={`save-status ${saveStatus}`}>
              {saveStatus === 'saving' ? 'Сохранение...' :
               saveStatus === 'saved' ? 'Сохранено!' : ''}
            </div>
          </div>
        </div>

        <div className="editor-content">
          <Editor
            height="400px"
            language={activeTab}
            value={code[activeTab]}
            onChange={(value) => handleEditorChange(value, activeTab)}
          />
        </div>
      </div>
    </div>
  );
};

export default EditProject;
