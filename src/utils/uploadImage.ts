import { supabase } from "../database/supabaseClient";
import { api } from "../services/api";

export interface UploadedImage {
  id: string; // Изменено с string | number на string
  url: string;
  name: string;
  projectId?: string;
  storagePath?: string;
}

export const uploadImage = async (file: File, projectId?: string): Promise<UploadedImage> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Not authenticated');

    const fileName = `${user.id}/${Date.now()}-${file.name.replace(/\s+/g, '-')}`;

    const { error: uploadError } = await supabase.storage
      .from('project-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('project-images')
      .getPublicUrl(fileName);

    const { data, error } = await api.saveImageInfo({
      projectId: projectId,
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type,
      storagePath: fileName,
      supabaseUrl: publicUrl
    });

    if (error) throw new Error(error);
    if (!data?.image) throw new Error('Failed to save image info');

    return {
      id: data.image.id.toString(), // Конвертируем в строку
      url: data.image.url,
      name: data.image.name,
      projectId: data.image.projectId,
      storagePath: fileName
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw new Error(error instanceof Error ? error.message : 'Upload failed');
  }
};
