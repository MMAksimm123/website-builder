import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../database/supabaseClient';
import '../../style/UserProgects/UserProjects.css';

interface UserProject {
  id: number;
  name: string;
  updated_at: string;
}

const CACHE_TTL = 0.25 * 60 * 1000; // 15 секунд
const getCacheKey = (userId: string) => `user_projects_${userId}`;

const UserProgects = () => {
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchProjects = useCallback(async (userId: string) => {
    // Проверка кэша
    const cacheKey = getCacheKey(userId);
    const cachedData = localStorage.getItem(cacheKey);
    const cacheTime = localStorage.getItem(`${cacheKey}_time`);

    if (cachedData && cacheTime && Date.now() - parseInt(cacheTime) < CACHE_TTL) {
      return JSON.parse(cachedData) as UserProject[];
    }

    // Запрос к базе данных
    const { data, error } = await supabase
      .from('user_projects')
      .select('id, name, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .range(0, 9);

    if (error) throw error;

    const projectsData = data || [];

    // Сохранение в кэш
    localStorage.setItem(cacheKey, JSON.stringify(projectsData));
    localStorage.setItem(`${cacheKey}_time`, Date.now().toString());

    return projectsData;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setInitialLoading(true);
        setError(null);

        // Получение текущего пользователя
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          navigate('/login');
          return;
        }

        // Загрузка проектов
        const projectsData = await fetchProjects(user.id);

        if (isMounted) {
          setProjects(projectsData);
        }
      } catch (err) {
        console.error('Ошибка при загрузке проектов:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Произошла ошибка при загрузке проектов');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          // Небольшая задержка для плавного исчезновения лоадера
          setTimeout(() => {
            if (isMounted) {
              setInitialLoading(false);
            }
          }, 300);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [navigate, fetchProjects]);

  const handleProjectClick = (projectId: number) => {
    navigate(`/edit/${projectId}`);
  };

  const handleRetry = () => {
    setInitialLoading(true);
    setError(null);
    // Перезапуск загрузки данных
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const projectsData = await fetchProjects(user.id);
          setProjects(projectsData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Произошла ошибка при загрузке проектов');
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    };
    loadData();
  };

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  // Отображение ошибки
  if (error) {
    return (
      <div className="listContainer">
        <h3>Ваши проекты</h3>
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <p className="error-message">{error}</p>
          <button onClick={handleRetry} className="retry-button">
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  // Отображение загрузки
  if (initialLoading) {
    return (
      <div className="listContainer">
        <h3>Ваши проекты</h3>
        <div className="loading-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Загрузка проектов...</p>
          </div>
        </div>
      </div>
    );
  }

  // Основной рендер
  return (
    <div className="listContainer">
      <h3>Ваши проекты</h3>
      <div>
        {loading ? (
          <div className="skeleton-loader">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="project-item-skeleton" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <p>У вас пока нет проектов</p>
            <button
              onClick={() => navigate('/create')}
              className="create-project-button"
            >
              Создать первый проект
            </button>
          </div>
        ) : (
          <ul className="projects-list">
            {projects.map((project) => (
              <li
                key={project.id}
                className="project-item"
                onClick={() => handleProjectClick(project.id)}
              >
                <div className="project-info">
                  <div className="project-name">
                    {project.name || `Проект ${project.id}`}
                  </div>
                  <div className="project-date">
                    Обновлен: {formatDate(project.updated_at)}
                  </div>
                </div>
                <div className="project-arrow">→</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default UserProgects;
