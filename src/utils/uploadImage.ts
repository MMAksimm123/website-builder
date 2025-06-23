import { supabase } from '../database/supabaseClient';

export interface UploadedImage {
  id: string;
  url: string;
  name: string;
  projectId?: number;
}

export const uploadImage = async (file: File, projectId?: number): Promise<UploadedImage> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Not authenticated');

  // Генерируем уникальное имя файла
  const fileName = `${user.id}/${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
  const filePath = `project-images/${fileName}`;

  // 1. Загружаем файл в Storage
  const { data: storageData, error: storageError } = await supabase.storage
    .from('project-images')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type
    });

  if (storageError) throw storageError;

  // 2. Сохраняем метаданные в новую таблицу
  const { data: imageData, error: dbError } = await supabase
    .from('portfolio_images')
    .insert({
      project_id: projectId,
      user_id: user.id,
      storage_path: filePath,
      file_name: file.name,
      file_size: file.size,
      content_type: file.type
    })
    .select('id')
    .single();

  if (dbError) throw dbError;

  // 3. Получаем публичный URL
  const { data: { publicUrl } } = supabase.storage
    .from('project-images')
    .getPublicUrl(fileName);

  return {
    id: imageData.id,
    url: publicUrl,
    name: file.name,
    projectId
  };
};
