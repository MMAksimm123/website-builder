import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../database/supabaseClient';
import '../../style/UserProgects/UserProjects.css';

interface UserProject {
  id: number;
  user_id: string;
  name: string;
  updated_at: string;
  html?: string;
  css?: string;
  js?: string;
}

const UserProgects = () => {
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserProjects = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          setError('Пользователь не авторизован');
          setLoading(false);
          return;
        }

        const { data, error: fetchError } = await supabase
          .from('user_projects')
          .select('id, user_id, name, updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        if (fetchError) {
          throw fetchError;
        }

        setProjects(data || []);
      } catch (err) {
        console.error('Ошибка при загрузке проектов:', err);
        setError('Не удалось загрузить проекты');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProjects();
  }, []);

  const handleProjectClick = async (projectId: number) => {
    try {
      const { data, error } = await supabase
        .from('user_projects')
        .select('html, css, js, name')
        .eq('id', projectId)
        .single();

      if (error) throw error;

      navigate(`/edit/${projectId}`, {
        state: {
          initialCode: {
            html: data.html || '',
            css: data.css || '',
            js: data.js || ''
          }
        }
      });
    } catch (err) {
      console.error('Ошибка при загрузке проекта:', err);
      setError('Не удалось загрузить проект');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="listContainer">
        <h3>Ваши проекты</h3>
        <div>Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="listContainer">
        <h3>Ваши проекты</h3>
        <div className="error-message">{error}</div>
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
