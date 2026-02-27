import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../style/UserProgects/UserProjects.css';
import { api } from '../../services/api';

interface UserProject {
  id: number;
  name: string;
  updated_at: string;
}

const CACHE_TTL = 0.25 * 60 * 1000;
const getCacheKey = (userId: string) => `user_projects_${userId}`;

const UserProgects = () => {
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<UserProject | null>(null);
  const navigate = useNavigate();

  const fetchProjects = useCallback(async () => {
    const token = api.getToken();
    if (!token) {
      throw new Error('No token');
    }

    const { data, error } = await api.getProjects();
    if (error) throw new Error(error);
    return data?.projects || [];
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setInitialLoading(true);
        setError(null);

        const token = api.getToken();
        if (!token) {
          navigate('/login');
          return;
        }

        const { data: userData, error: userError } = await api.getCurrentUser();
        if (userError || !userData?.user) {
          api.clearToken();
          navigate('/login');
          return;
        }

        const projectsData = await fetchProjects();

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

  const handleDeleteClick = (e: React.MouseEvent, project: UserProject) => {
    e.stopPropagation();
    setProjectToDelete(project);
    setShowDeleteModal(true);
  };

  const handleCloseModal = () => {
    setShowDeleteModal(false);
    setProjectToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;

    setDeletingId(projectToDelete.id);
    setShowDeleteModal(false);

    try {
      const { error } = await api.deleteProject(projectToDelete.id.toString());
      if (error) throw new Error(error);

      setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
      alert('Проект успешно удален');
    } catch (err) {
      console.error('Ошибка при удалении проекта:', err);
      alert('Произошла ошибка при удалении проекта');
    } finally {
      setDeletingId(null);
      setProjectToDelete(null);
    }
  };

  const handleRetry = () => {
    setInitialLoading(true);
    setError(null);
    const loadData = async () => {
      try {
        const projectsData = await fetchProjects();
        setProjects(projectsData);
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
          </div>
        ) : (
          <ul className="projects-list">
            {projects.map((project) => (
              <li
                key={project.id}
                className={`project-item ${deletingId === project.id ? 'deleting' : ''}`}
              >
                <div
                  className="project-info"
                  onClick={() => handleProjectClick(project.id)}
                >
                  <div className="project-name">
                    {project.name || `Проект ${project.id}`}
                  </div>
                  <div className="project-date">
                    Обновлен: {formatDate(project.updated_at)}
                  </div>
                </div>
                <div className="project-actions">
                  <button
                    className="project-delete-btn"
                    onClick={(e) => handleDeleteClick(e, project)}
                    disabled={deletingId === project.id}
                    title="Удалить проект"
                  >
                    {deletingId === project.id ? (
                      <span className="deleting-spinner"></span>
                    ) : (
                      '🗑️'
                    )}
                  </button>
                  <div className="project-arrow">→</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showDeleteModal && projectToDelete && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Подтверждение удаления</h3>
            <p>Вы уверены, что хотите удалить проект "{projectToDelete.name || `Проект ${projectToDelete.id}`}"?</p>
            <p className="modal-warning">Это действие нельзя отменить.</p>
            <div className="modal-actions">
              <button
                onClick={handleConfirmDelete}
                className="modal-delete-btn"
              >
                Удалить
              </button>
              <button
                onClick={handleCloseModal}
                className="modal-cancel-btn"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProgects;
