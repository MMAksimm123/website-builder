import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../database/supabaseClient';
import '../../style/UserProgects/UserProjects.css';

interface UserProject {
  id: number;
  name: string;
  updated_at: string;
}

const CACHE_TTL = 1 * 60 * 1000; // 5 минут
const getCacheKey = (userId: string) => `user_projects_${userId}`;

const UserProgects = () => {
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Загрузка данных с кэшированием
  const fetchProjects = useCallback(async (userId: string) => {
    const cacheKey = getCacheKey(userId);
    const cachedData = localStorage.getItem(cacheKey);
    const cacheTime = localStorage.getItem(`${cacheKey}_time`);

    // Возвращаем кэшированные данные, если они актуальны
    if (cachedData && cacheTime && Date.now() - parseInt(cacheTime) < CACHE_TTL) {
      return JSON.parse(cachedData) as UserProject[];
    }

    // Загружаем свежие данные
    const { data, error } = await supabase
      .from('user_projects')
      .select('id, name, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .range(0, 9);

    if (error) throw error;

    const projectsData = data || [];

    // Сохраняем в кэш
    localStorage.setItem(cacheKey, JSON.stringify(projectsData));
    localStorage.setItem(`${cacheKey}_time`, Date.now().toString());

    return projectsData;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);

        // Получаем пользователя
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          navigate('/login');
          return;
        }

        // Загружаем проекты
        const projectsData = await fetchProjects(user.id);

        if (isMounted) {
          setProjects(projectsData);
        }
      } catch (err) {
        console.error('Ошибка при загрузке проектов:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
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

  if (loading) {
    return (
      <div className="listContainer">
        <h3>Ваши проекты</h3>
        <div className="skeleton-loader">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="project-item-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="listContainer">
      <h3>Ваши проекты</h3>
      <div>
        {projects.length === 0 ? (
          <p>У вас пока нет проектов</p>
        ) : (
          <ul className="projects-list">
            {projects.map((project) => (
              <li
                key={project.id}
                className="project-item"
                onClick={() => handleProjectClick(project.id)}
              >
                <div className="project-name">
                  {project.name || `Проект ${project.id}`}
                </div>
                <div className="project-date">
                  Обновлен: {formatDate(project.updated_at)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default UserProgects;
