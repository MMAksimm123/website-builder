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
  const editorRef = useRef<any>(null);
  let saveTimer: NodeJS.Timeout;

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

  const handleEditorChange = (value: string | undefined, language: 'html' | 'css' | 'js') => {
    if (value === undefined) return;

    const newCode = { ...code, [language]: value };
    setCode(newCode);

    if (AUTO_SAVE_ENABLED) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => saveProject(newCode), SAVE_DEBOUNCE_DELAY);
    }
  };

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

  const handleSaveToZip = () => {
    const zip = new JSZip();
    zip.file("index.html", code.html);
    zip.file("style.css", code.css);
    zip.file("index.js", code.js);
    zip.generateAsync({ type: "blob" }).then(saveAs);
  };

  return (
    <div className="dev-area">
      <header className='headerPanelDev'>
        <Logo createSitePath='main'/>
        <h2>Редактирование: {projectName}</h2>
        <LogoutButton />
      </header>
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
            <div className={`save-status ${saveStatus}`}>
              {saveStatus === 'saving' ? 'Сохранение...' :
               saveStatus === 'saved' ? 'Сохранено!' : ''}
            </div>
            <ImageUploader
              projectId={id}
              onImageUploaded={handleImageUploaded}
              onInsertImage={handleInsertImage}
            />
            <button className="save-btn zip" onClick={handleSaveToZip}>
              Сохранить в ZIP
            </button>
          </div>
        </div>

        <div className="editor-content">
          <Editor
            height="400px"
            language={activeTab}
            value={code[activeTab]}
            onChange={(value) => handleEditorChange(value, activeTab)}
            onMount={handleEditorDidMount}
          />
        </div>
      </div>
    </div>
  );
};

export default EditProject;
