import { useState } from 'react';
import { UploadedImage, uploadImage } from '../../utils/uploadImage';
import '../../style/ImageUploader/ImageUploader.css'

interface ImageUploaderProps {
  projectId?: string | number;
  onImageUploaded?: (image: UploadedImage) => void;
  onInsertImage?: (url: string) => void;
}

const ImageUploader = ({ projectId, onImageUploaded, onInsertImage }: ImageUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_FILE_SIZE = 102400;
    if (file.size > MAX_FILE_SIZE) {
      alert('Размер файла не должен превышать 100кБ');
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const projectIdStr = projectId ? projectId.toString() : undefined;
      const uploadedImage = await uploadImage(file, projectIdStr);

      setImageUrl(uploadedImage.url);
      setShowModal(true);
      setCopySuccess(false);

      if (onImageUploaded) {
        onImageUploaded(uploadedImage);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Ошибка загрузки: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Метод копирования для HTTP (работает через execCommand)
  const copyToClipboardHttp = (text: string): boolean => {
    try {
      // Создаем временное текстовое поле
      const textarea = document.createElement('textarea');
      textarea.value = text;

      // Делаем элемент невидимым
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      textarea.style.left = '-9999px';
      textarea.style.opacity = '0';
      textarea.style.pointerEvents = 'none';

      document.body.appendChild(textarea);

      // Выделяем текст
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, text.length);

      // Копируем
      const successful = document.execCommand('copy');

      // Удаляем временное поле
      document.body.removeChild(textarea);

      if (successful) {
        console.log('Copied using execCommand');
        return true;
      } else {
        console.error('execCommand copy failed');
        return false;
      }
    } catch (err) {
      console.error('HTTP copy failed:', err);
      return false;
    }
  };

  // Метод с выделением текста (пользователь копирует сам)
  const selectAndCopy = () => {
    const urlInput = document.querySelector('.url-input') as HTMLInputElement;
    if (urlInput) {
      urlInput.select();
      urlInput.setSelectionRange(0, urlInput.value.length);

      // Показываем подсказку
      alert('Ссылка выделена. Нажмите Ctrl+C (Cmd+C на Mac) для копирования');
    }
  };

  // Основная функция копирования
  const copyToClipboard = async () => {
    if (!imageUrl) return;

    setCopySuccess(false);

    // Пробуем метод для HTTP
    const success = copyToClipboardHttp(imageUrl);

    if (success) {
      setCopySuccess(true);
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
    } else {
      // Если не получилось, выделяем текст для ручного копирования
      selectAndCopy();
    }
  };

  const handleInsert = () => {
    if (onInsertImage && imageUrl) {
      onInsertImage(imageUrl);
      setShowModal(false);
    }
  };

  return (
    <div className="image-uploader">
      <label className={`upload-button ${isUploading ? 'uploading' : ''}`}>
        {isUploading ? 'Загрузка...' : 'Загрузить изображение'}
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={isUploading}
          style={{ display: 'none' }}
        />
      </label>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Изображение успешно загружено</h3>
            <div className="url-container">
              <input
                type="text"
                value={imageUrl}
                readOnly
                className="url-input"
                id="image-url-input"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={copyToClipboard}
                className={`copy-button ${copySuccess ? 'success' : ''}`}
              >
                {copySuccess ? '✓ Скопировано!' : 'Копировать'}
              </button>
            </div>
            {/* <p className="copy-hint">
              💡 Если кнопка не работает, выделите ссылку вручную и нажмите Ctrl+C
            </p> */}
            <div className="modal-actions">
              {onInsertImage && (
                <button
                  onClick={handleInsert}
                  className="insert-button"
                >
                  Вставить в редактор
                </button>
              )}
              <button
                onClick={() => setShowModal(false)}
                className="close-button"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
