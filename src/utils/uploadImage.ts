import { supabase } from "../database/supabaseClient";

export interface UploadedImage {
  id: string;
  url: string;
  name: string;
  projectId?: string;
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

    const { data: imageData, error: dbError } = await supabase
      .from('portfolio_images')
      .insert({
        project_id: projectId,
        user_id: user.id,
        storage_path: `project-images/${fileName}`,
        file_name: file.name,
        file_size: file.size,
        content_type: file.type
      })
      .select('id, project_id')
      .single();

    if (dbError) throw dbError;

    return {
      id: imageData.id,
      url: publicUrl,
      name: file.name,
      projectId: imageData.project_id
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw new Error(error instanceof Error ? error.message : 'Upload failed');
  }
};
