import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import '../../style/dragAndDropUploader/DragAndDropUploader.css';

interface UploadedFile {
  name: string;
  content: string;
  type: 'html' | 'css' | 'js';
}

interface ProjectFiles {
  html?: UploadedFile;
  css?: UploadedFile;
  js?: UploadedFile;
}

const DragAndDropUploader: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [projectFiles, setProjectFiles] = useState<ProjectFiles>({});
  const [projectName, setProjectName] = useState<string>('');
  const [error, setError] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const getFileType = (filename: string): 'html' | 'css' | 'js' | null => {
    const extension = filename.split('.').pop()?.toLowerCase();
    if (extension === 'html' || extension === 'htm') return 'html';
    if (extension === 'css') return 'css';
    if (extension === 'js') return 'js';
    return null;
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error(`Ошибка чтения файла ${file.name}`));
      reader.readAsText(file);
    });
  };

  const extractProjectName = (htmlContent: string): string => {
    const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/i);
    return titleMatch && titleMatch[1] ? titleMatch[1].trim() : '';
  };

  const processFiles = async (fileList: FileList) => {
    const files = Array.from(fileList);

    for (const file of files) {
      const fileType = getFileType(file.name);
      if (fileType) {
        try {
          setIsUploading(true);
          const content = await readFileContent(file);

          setProjectFiles(prev => {
            const newFiles = { ...prev };
            newFiles[fileType] = {
              name: file.name,
              content,
              type: fileType
            };
            return newFiles;
          });

          // Если загружен HTML, пытаемся извлечь название
          if (fileType === 'html') {
            const name = extractProjectName(content);
            if (name) setProjectName(name);
          }

          setError('');
        } catch (err) {
          setError(`Ошибка загрузки файла ${file.name}`);
        } finally {
          setIsUploading(false);
        }
      }
    }
  };

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFiles(files);
    }
    // Сбрасываем input, чтобы можно было выбрать те же файлы снова
    e.target.value = '';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processFiles(files);
    }
  }, []);

  const handleDropZoneClick = () => {
    // Программно открываем диалог выбора файлов
    fileInputRef.current?.click();
  };

  const triggerFileInput = (type: 'html' | 'css' | 'js') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'html' ? '.html,.htm' : `.${type}`;
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setIsUploading(true);
        try {
          const content = await readFileContent(file);

          setProjectFiles(prev => {
            const newFiles = { ...prev };
            newFiles[type] = {
              name: file.name,
              content,
              type
            };
            return newFiles;
          });

          if (type === 'html') {
            const name = extractProjectName(content);
            if (name) setProjectName(name);
          }

          setError('');
        } catch (err) {
          setError(`Ошибка загрузки файла ${file.name}`);
        } finally {
          setIsUploading(false);
        }
      }
    };
    input.click();
  };

  const removeFile = (type: 'html' | 'css' | 'js') => {
    setProjectFiles(prev => {
      const newFiles = { ...prev };
      delete newFiles[type];
      return newFiles;
    });

    // Если удаляем HTML, очищаем название проекта
    if (type === 'html') {
      setProjectName('');
    }
  };

  const handleCreateProject = async () => {
    if (!projectFiles.html) {
      setError('Необходимо загрузить HTML файл');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const { data, error: createError } = await api.createProject(
        projectName || 'Новый проект',
        projectFiles.html.content,
        projectFiles.css?.content || '',
        projectFiles.js?.content || ''
      );

      if (createError) throw new Error(createError);
      if (!data?.project) throw new Error('Не удалось создать проект');

      // Перенаправляем на страницу редактирования
      navigate(`/edit/${data.project.id}`);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при создании проекта');
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setProjectFiles({});
    setProjectName('');
    setError('');
  };

  return (
    <div className="drag-drop-uploader">
      {/* Скрытый input для выбора файлов */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".html,.htm,.css,.js"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Зона drag-and-drop с возможностью клика */}
      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleDropZoneClick}
      >
        <div className="drop-zone-content">
          <svg className="upload-icon" viewBox="0 0 24 24" width="48" height="48">
            <path fill="currentColor" d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
          </svg>
          <p className="drop-zone-title">
            Перетащите файлы сюда или нажмите для выбора
          </p>
          <p className="drop-zone-hint">
            Поддерживаются файлы: .html, .css, .js
          </p>
          <p className="drop-zone-hint">
            Можно выбрать несколько файлов одновременно
          </p>
        </div>
      </div>

      {/* Кнопки для загрузки отдельных файлов */}
      <div className="file-upload-buttons">
        <button
          className={`upload-btn html-btn ${projectFiles.html ? 'loaded' : ''}`}
          onClick={() => triggerFileInput('html')}
          disabled={isUploading}
        >
          {projectFiles.html ? '✓ HTML загружен' : 'Загрузить HTML'}
        </button>
        <button
          className={`upload-btn css-btn ${projectFiles.css ? 'loaded' : ''}`}
          onClick={() => triggerFileInput('css')}
          disabled={isUploading}
        >
          {projectFiles.css ? '✓ CSS загружен' : 'Загрузить CSS'}
        </button>
        <button
          className={`upload-btn js-btn ${projectFiles.js ? 'loaded' : ''}`}
          onClick={() => triggerFileInput('js')}
          disabled={isUploading}
        >
          {projectFiles.js ? '✓ JS загружен' : 'Загрузить JS'}
        </button>
      </div>

      {/* Список загруженных файлов */}
      {Object.keys(projectFiles).length > 0 && (
        <div className="loaded-files">
          <h4>Загруженные файлы:</h4>
          <ul className="files-list">
            {projectFiles.html && (
              <li className="file-item">
                <span className="file-icon">📄</span>
                <span className="file-name">{projectFiles.html.name}</span>
                <button
                  className="remove-file-btn"
                  onClick={() => removeFile('html')}
                  disabled={isUploading}
                >
                  ✕
                </button>
              </li>
            )}
            {projectFiles.css && (
              <li className="file-item">
                <span className="file-icon">🎨</span>
                <span className="file-name">{projectFiles.css.name}</span>
                <button
                  className="remove-file-btn"
                  onClick={() => removeFile('css')}
                  disabled={isUploading}
                >
                  ✕
                </button>
              </li>
            )}
            {projectFiles.js && (
              <li className="file-item">
                <span className="file-icon">⚡</span>
                <span className="file-name">{projectFiles.js.name}</span>
                <button
                  className="remove-file-btn"
                  onClick={() => removeFile('js')}
                  disabled={isUploading}
                >
                  ✕
                </button>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Название проекта */}
      {projectFiles.html && (
        <div className="project-name-section">
          <label htmlFor="project-name">Название проекта:</label>
          <input
            type="text"
            id="project-name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Введите название проекта"
            className="project-name-input"
            disabled={isUploading}
          />
        </div>
      )}

      {/* Кнопки действий */}
      <div className="action-buttons">
        <button
          className="reset-btn"
          onClick={handleReset}
          disabled={isUploading || Object.keys(projectFiles).length === 0}
        >
          Очистить всё
        </button>
        <button
          className="create-btn"
          onClick={handleCreateProject}
          disabled={!projectFiles.html || isUploading}
        >
          {isUploading ? 'Создание...' : 'Создать проект'}
        </button>
      </div>

      {/* Ошибки */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
};

export default DragAndDropUploader;
