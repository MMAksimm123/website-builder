import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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

const DevArea = () => {
  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js'>('html');
  const [code, setCode] = useState(DEFAULT_TEMPLATE);
  const [srcDoc, setSrcDoc] = useState('');
  const [userId, setUserId] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const editorRef = useRef<any>(null);
  const navigate = useNavigate();

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
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      setUserId(user.id);

      const template = await loadTemplateFiles(1);
      if (template) {
        setCode(template);
      }
    };

    init();
  }, [navigate]);

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

  const handleSaveToCloud = useCallback(async () => {
    const projectName = prompt('Название проекта:');
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
      setTimeout(() => navigate(`/edit/${data.id}`, {
        state: { initialCode: code }
      }), 1000);
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('idle');
    }
  }, [code, userId, navigate]);

  const handleSaveToZip = useCallback(() => {
    const zip = new JSZip();
    zip.file("index.html", code.html);
    zip.file("style.css", code.css);
    zip.file("index.js", code.js);
    zip.generateAsync({ type: "blob" }).then(saveAs);
  }, [code]);

  const handleEditorChange = (value: string | undefined, language: 'html' | 'css' | 'js') => {
    if (value !== undefined) {
      setCode(prev => ({ ...prev, [language]: value }));
    }
  };

  return (
    <div className="dev-area">
      <header className='headerPanelDev'>
        <Logo createSitePath='main'/>
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
            {/* <ImageUploader
              onImageUploaded={handleImageUploaded}
              onInsertImage={handleInsertImage}
            /> */}
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

export default DevArea;
