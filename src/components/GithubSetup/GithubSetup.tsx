import React, { useState, useEffect } from 'react';
import '../../style/GithubSetup/GithubSetup.css';
import { validateGitHubToken, getUserRepos, GitHubRepo } from '../../utils/github';

interface GithubSetupProps {
  onSave: (config: { token: string; repo: string; isPrivate: boolean }) => void;
  onClose: () => void;
  initialToken?: string;
  initialRepo?: string;
}

const GithubSetup: React.FC<GithubSetupProps> = ({
  onSave,
  onClose,
  initialToken = '',
  initialRepo = ''
}) => {
  const [step, setStep] = useState<'token' | 'repo'>(initialToken ? 'repo' : 'token');
  const [token, setToken] = useState(initialToken);
  const [repoName, setRepoName] = useState(initialRepo.split('/')[1] || '');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [userRepos, setUserRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState(initialRepo);
  const [mode, setMode] = useState<'existing' | 'new'>('new');

  useEffect(() => {
    if (initialRepo) {
      setSelectedRepo(initialRepo);
    }
  }, [initialRepo]);

  const handleValidateToken = async () => {
    setIsValidating(true);
    setError('');

    try {
      const result = await validateGitHubToken(token);
      if (result.valid && result.username) {
        setUsername(result.username);

        // Загружаем список репозиториев
        const repos = await getUserRepos(token);
        setUserRepos(repos);

        setStep('repo');
      } else {
        setError('Недействительный GitHub токен');
      }
    } catch (err) {
      setError('Ошибка при проверке токена');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = () => {
    if (mode === 'existing') {
      if (!selectedRepo) {
        setError('Выберите репозиторий');
        return;
      }
      onSave({ token, repo: selectedRepo, isPrivate });
    } else {
      if (!repoName) {
        setError('Введите название репозитория');
        return;
      }
      const fullRepoName = `${username}/${repoName}`;
      onSave({ token, repo: fullRepoName, isPrivate });
    }
  };

  return (
    <div className="github-modal-overlay" onClick={onClose}>
      <div className="github-modal-content" onClick={e => e.stopPropagation()}>
        <h3>Настройка GitHub</h3>

        {step === 'token' && (
          <>
            <p className="github-instructions">
              Для работы с GitHub вам потребуется Personal Access Token.
              <a
                href="https://github.com/settings/tokens/new?scopes=repo"
                target="_blank"
                rel="noopener noreferrer"
                className="github-link"
              >
                Создать токен
              </a>
            </p>

            <div className="form-group">
              <label>GitHub Token</label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="github-input"
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={onClose}
              >
                Отмена
              </button>
              <button
                className="save-btn"
                onClick={handleValidateToken}
                disabled={!token || isValidating}
              >
                {isValidating ? 'Проверка...' : 'Далее'}
              </button>
            </div>
          </>
        )}

        {step === 'repo' && (
          <>
            <div className="repo-mode-selector">
              <button
                className={`mode-btn ${mode === 'new' ? 'active' : ''}`}
                onClick={() => setMode('new')}
              >
                Новый репозиторий
              </button>
              <button
                className={`mode-btn ${mode === 'existing' ? 'active' : ''}`}
                onClick={() => setMode('existing')}
              >
                Существующий
              </button>
            </div>

            {mode === 'new' ? (
              <>
                <div className="form-group">
                  <label>Название репозитория</label>
                  <div className="repo-name-preview">
                    <span className="username">{username}/</span>
                    <input
                      type="text"
                      value={repoName}
                      onChange={(e) => setRepoName(e.target.value.replace(/[^a-zA-Z0-9\-_]/g, ''))}
                      placeholder="my-landing-page"
                      className="repo-name-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                    />
                    Приватный репозиторий
                  </label>
                </div>
              </>
            ) : (
              <div className="form-group">
                <label>Выберите репозиторий</label>
                <select
                  value={selectedRepo}
                  onChange={(e) => setSelectedRepo(e.target.value)}
                  className="repo-select"
                >
                  <option value="">Выберите репозиторий</option>
                  {userRepos.map(repo => (
                    <option key={repo.id} value={repo.full_name}>
                      {repo.full_name} {repo.private ? '(приватный)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {error && <div className="error-message">{error}</div>}

            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => setStep('token')}
              >
                Назад
              </button>
              <button
                className="save-btn"
                onClick={handleSave}
                disabled={mode === 'new' ? !repoName : !selectedRepo}
              >
                Сохранить
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GithubSetup;
