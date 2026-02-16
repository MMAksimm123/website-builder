import { useState } from 'react';
import { UploadedImage, uploadImage } from '../../utils/uploadImage';
import '../../style/ImageUploader/ImageUploader.css'

interface ImageUploaderProps {
  projectId?: string;
  onImageUploaded?: (image: UploadedImage) => void;
  onInsertImage?: (url: string) => void;
}

const ImageUploader = ({ projectId, onImageUploaded, onInsertImage }: ImageUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка размера файла (100кБ = 102400 байт)
    const MAX_FILE_SIZE = 102400;
    if (file.size > MAX_FILE_SIZE) {
      alert('Размер файла не должен превышать 100кБ');
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const uploadedImage = await uploadImage(file, projectId);
      setImageUrl(uploadedImage.url);
      setShowModal(true);

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

  const copyToClipboard = () => {
    navigator.clipboard.writeText(imageUrl)
      .then(() => alert('Ссылка скопирована в буфер обмена'))
      .catch(err => console.error('Ошибка копирования:', err));
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
                onClick={e => e.currentTarget.select()}
              />
              <button onClick={copyToClipboard} className="copy-button">
                Копировать
              </button>
            </div>
            <div className="modal-actions">
              {/* {onInsertImage && (
                <button
                  onClick={handleInsert}
                  className="insert-button"
                >
                  Вставить в редактор
                </button>
              )} */}
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
