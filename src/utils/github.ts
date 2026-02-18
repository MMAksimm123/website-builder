interface GitHubContent {
  content?: string;
  sha?: string;
  encoding?: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  private: boolean;
}

interface GitHubFile {
  path: string;
  content: string;
  message: string;
  branch?: string;
}

class GitHubClient {
  private token: string;
  private repo: string;
  private owner: string;

  constructor(token: string, repoFullName: string) {
    this.token = token;
    const [owner, repo] = repoFullName.split('/');
    this.owner = owner;
    this.repo = repo;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'GitHub API error');
    }

    return response.json();
  }

  // Проверка существования репозитория
  async checkRepoExists(): Promise<boolean> {
    try {
      await this.request('');
      return true;
    } catch (error) {
      return false;
    }
  }

  // Создание нового репозитория
  async createRepo(name: string, isPrivate: boolean = false): Promise<GitHubRepo> {
    const response = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        private: isPrivate,
        auto_init: true,
        description: 'Сайт созданный в конструкторе лендингов'
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create repository');
    }

    return response.json();
  }

  // Получение SHA файла (нужно для обновления)
  async getFileSha(path: string): Promise<string | null> {
    try {
      const data: GitHubContent = await this.request(`/contents/${path}`);
      return data.sha || null;
    } catch {
      return null;
    }
  }

  // Создание или обновление файла
  async createOrUpdateFile(file: GitHubFile): Promise<void> {
    const existingSha = await this.getFileSha(file.path);

    const body: any = {
      message: file.message,
      content: btoa(unescape(encodeURIComponent(file.content))), // Кодируем в base64 правильно
      branch: file.branch || 'main',
    };

    if (existingSha) {
      body.sha = existingSha;
    }

    await this.request(`/contents/${file.path}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  // Загрузка всех файлов проекта
  async uploadProject(files: {
    html: string;
    css: string;
    js: string;
  }, commitMessage: string = 'Обновление сайта'): Promise<void> {
    await this.createOrUpdateFile({
      path: 'index.html',
      content: files.html,
      message: commitMessage,
    });

    await this.createOrUpdateFile({
      path: 'style.css',
      content: files.css,
      message: commitMessage,
    });

    await this.createOrUpdateFile({
      path: 'script.js',
      content: files.js,
      message: commitMessage,
    });

    // Создаем README.md с информацией о проекте
    const readme = `# Сайт созданный в конструкторе лендингов

Этот сайт был создан с помощью онлайн редактора лендингов.

## Структура проекта
- \`index.html\` - HTML структура
- \`style.css\` - Стили
- \`script.js\` - JavaScript код

## Как использовать
1. Скачайте все файлы
2. Откройте \`index.html\` в браузере
3. Или загрузите на любой хостинг

Последнее обновление: ${new Date().toLocaleString('ru-RU')}
    `;

    await this.createOrUpdateFile({
      path: 'README.md',
      content: readme,
      message: commitMessage,
    });
  }

  // Получение URL репозитория
  async getRepoUrl(): Promise<string> {
    const data = await this.request('');
    return data.html_url;
  }
}

// Функция для проверки валидности токена
export const validateGitHubToken = async (token: string): Promise<{ valid: boolean; username?: string }> => {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      return { valid: false };
    }

    const data = await response.json();
    return { valid: true, username: data.login };
  } catch {
    return { valid: false };
  }
};

// Функция для получения списка репозиториев пользователя
export const getUserRepos = async (token: string): Promise<GitHubRepo[]> => {
  const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch repositories');
  }

  return response.json();
};

export default GitHubClient;
