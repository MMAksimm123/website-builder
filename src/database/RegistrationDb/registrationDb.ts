import { supabase } from "../supabaseClient";

export const registerUser = async (email: string, password: string): Promise<{ data?: any; error?: any }> => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    return { data };
  } catch (error) {
    return { error };
  }
};
