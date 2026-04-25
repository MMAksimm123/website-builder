import { supabase } from "../database/supabaseClient";
import { api } from "../services/api";

export interface UploadedImage {
  id: string;
  url: string;
  name: string;
  projectId?: string;
  storagePath?: string;
}

// Функция для безопасного форматирования имени файла
const safeFileName = (fileName: string): string => {
  // Транслитерация русских символов
  const transliterate = (str: string): string => {
    const ru: { [key: string]: string } = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
      'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
      'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
      'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '',
      'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
      'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'E',
      'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
      'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
      'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch', 'Ъ': '',
      'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
    };

    return str.replace(/[а-яА-ЯёЁ]/g, (match) => ru[match] || match);
  };

  // Получаем имя файла без расширения
  const lastDotIndex = fileName.lastIndexOf('.');
  const name = lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
  const ext = lastDotIndex > 0 ? fileName.substring(lastDotIndex) : '';

  // Транслитерация и замена недопустимых символов
  const safeName = transliterate(name)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-') // заменяем все спецсимволы на дефис
    .replace(/-+/g, '-') // убираем множественные дефисы
    .replace(/^-|-$/g, ''); // убираем дефисы в начале и конце

  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);

  return `${safeName}-${timestamp}-${random}${ext}`;
};

export const uploadImage = async (file: File, projectId?: string): Promise<UploadedImage> => {
  try {
    // Получаем текущего пользователя из локальной БД через API
    const token = api.getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const { data: userData, error: userError } = await api.getCurrentUser();
    if (userError || !userData?.user) {
      throw new Error('Not authenticated');
    }

    const userId = userData.user.id;
    // Формируем безопасное имя файла
    const originalExt = file.name.split('.').pop()?.toLowerCase() || 'png';
    const safeName = safeFileName(file.name);
    const fileName = `${userId}/${safeName}.${originalExt}`;

    console.log('Uploading file:', {
      originalName: file.name,
      safeName: fileName,
      size: file.size,
      type: file.type
    });

    // Загружаем в Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('project-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('project-images')
      .getPublicUrl(fileName);

    // Сохраняем информацию в локальной БД
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
      id: data.image.id.toString(),
      url: data.image.url,
      name: file.name,
      projectId: data.image.projectId,
      storagePath: fileName
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw new Error(error instanceof Error ? error.message : 'Upload failed');
  }
};
