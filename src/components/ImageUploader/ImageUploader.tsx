import { useState } from 'react';
import { uploadImage } from '../../utils/uploadImage';
import './ImageUploader.css';

interface ImageUploaderProps {
  projectId?: number;
  onImageUploaded: (image: { id: string; url: string; name: string }) => void;
}

const ImageUploader = ({ projectId, onImageUploaded }: ImageUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const uploadedImage = await uploadImage(file, projectId);
      onImageUploaded(uploadedImage);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setIsUploading(false);
      e.target.value = ''; // Сбрасываем значение input
    }
  };

  return (
    <div className="image-uploader">
      <label className={`upload-button ${isUploading ? 'uploading' : ''}`}>
        {isUploading ? (
          <span>Uploading...</span>
        ) : (
          <>
            <span>Upload Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isUploading}
              style={{ display: 'none' }}
            />
          </>
        )}
      </label>
    </div>
  );
};

export default ImageUploader;
