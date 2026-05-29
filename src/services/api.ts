const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Функция для генерации UUID
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

interface User {
  id: number;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  userType: 'user';
}

interface OAuthUser {
  id: number;
  provider: string;
  providerId: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  userType: 'oauth';
}

type UserProfile = User | OAuthUser;

interface Project {
  id: number;
  ownerType: 'user' | 'oauth';
  ownerId: number;
  name: string;
  html?: string;
  css?: string;
  js?: string;
  github_repo?: string;
  github_last_sync?: string;
  created_at: string;
  updated_at: string;
}

interface AuthResponse {
  user: UserProfile;
  token: string;
  userType: 'user' | 'oauth';
}

interface ProjectsResponse {
  projects: Project[];
}

interface ProjectResponse {
  project: Project;
}

interface Template {
  id: number;
  name: string;
  description?: string;
  html: string;
  css?: string;
  js?: string;
  thumbnail_url?: string;
  is_active?: boolean;
  created_by?: number;
  created_at: string;
  updated_at?: string;
}

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  getToken(): string | null {
    return this.token;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    let traceId = localStorage.getItem('trace_id');
    if (!traceId) {
      traceId = generateUUID();
      localStorage.setItem('trace_id', traceId);
    }

    const url = `${API_URL}${endpoint}`;

    console.log('API Request:', {
      url,
      method: options.method || 'GET',
      hasToken: !!this.token,
      traceId
    });

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'x-trace-id': traceId
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('API Error:', data);
        return { error: data.error || 'Request failed' };
      }

      console.log('API Success:', data);
      return { data };
    } catch (error) {
      console.error('Network Error:', error);
      return { error: error instanceof Error ? error.message : 'Network error' };
    }
  }

  // Auth endpoints
  async register(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async login(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getCurrentUser(): Promise<ApiResponse<{ user: User }>> {
    return this.request<{ user: User }>('/api/auth/me');
  }

  // Projects endpoints
  async getProjects(): Promise<ApiResponse<ProjectsResponse>> {
    return this.request<ProjectsResponse>('/api/projects');
  }

  async createProject(
    name: string,
    html: string = '',
    css: string = '',
    js: string = ''
  ): Promise<ApiResponse<ProjectResponse>> {
    return this.request<ProjectResponse>('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name, html, css, js }),
    });
  }

  async getProject(id: string): Promise<ApiResponse<ProjectResponse>> {
    return this.request<ProjectResponse>(`/api/projects/${id}`);
  }

  async updateProject(
    id: string,
    data: { name?: string; html?: string; css?: string; js?: string }
  ): Promise<ApiResponse<ProjectResponse>> {
    return this.request<ProjectResponse>(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/api/projects/${id}`, {
      method: 'DELETE',
    });
  }

  async saveGithubSettings(
    projectId: string,
    repo: string,
    token: string
  ): Promise<ApiResponse<{ github: any }>> {
    return this.request<{ github: any }>(`/api/projects/${projectId}/github`, {
      method: 'POST',
      body: JSON.stringify({ repo, token }),
    });
  }

  // Image endpoints
  async saveImageInfo(data: {
    projectId?: string;
    fileName: string;
    fileSize: number;
    contentType: string;
    storagePath: string;
    supabaseUrl: string;
  }) {
    const response = await this.request<{ image: any }>('/api/images', {
      method: 'POST',
      body: JSON.stringify({
        projectId: data.projectId,
        fileName: data.fileName,
        fileSize: data.fileSize,
        contentType: data.contentType,
        storagePath: data.storagePath,
        supabaseUrl: data.supabaseUrl
      }),
    });

    if (response.data?.image && typeof response.data.image.id === 'number') {
      response.data.image.id = response.data.image.id.toString();
    }

    return response;
  }

  async getProjectImages(projectId: string | number) {
    return this.request<{ images: any[] }>(`/api/images/project/${projectId}`);
  }

  async deleteImageRecord(id: number) {
    return this.request<{ message: string }>(`/api/images/${id}`, {
      method: 'DELETE',
    });
  }

  // Logout
  logout() {
    this.clearToken();
  }

    // Templates endpoints
  async getTemplates(): Promise<ApiResponse<{ templates: Template[] }>> {
    return this.request<{ templates: Template[] }>('/api/templates');
  }

  async getTemplate(id: number): Promise<ApiResponse<{ template: Template }>> {
    return this.request<{ template: Template }>(`/api/templates/${id}`);
  }

  async createTemplate(data: {
    name: string;
    description?: string;
    html: string;
    css?: string;
    js?: string;
    thumbnail_url?: string;
  }): Promise<ApiResponse<{ template: Template }>> {
    return this.request<{ template: Template }>('/api/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTemplate(id: number, data: Partial<Template>): Promise<ApiResponse<{ template: Template }>> {
    return this.request<{ template: Template }>(`/api/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTemplate(id: number): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/api/templates/${id}`, {
      method: 'DELETE',
    });
  }

  async getPublicProject(id: string): Promise<ApiResponse<{ project: Project }>> {
    return this.request<{ project: Project }>(`/api/projects/public/${id}`);
  }
}

export const api = new ApiService();
