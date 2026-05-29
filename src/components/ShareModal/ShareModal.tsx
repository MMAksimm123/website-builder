import { useState } from 'react';
import '../../style/ShareModal/ShareModal.css';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  projectName: string;
  isSaved?: boolean;
  onSave?: () => Promise<void>;
}

const ShareModal = ({ isOpen, onClose, projectId, projectName, isSaved = true, onSave }: ShareModalProps) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProjectSaved, setIsProjectSaved] = useState(isSaved);
  const [showEmailOptions, setShowEmailOptions] = useState(false);

  const shareUrl = `${window.location.origin}/view/${projectId}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch {
        alert('Не удалось скопировать ссылку. Выделите её вручную и нажмите Ctrl+C');
      }
    }
  };

  const handleSaveAndShare = async () => {
    if (onSave) {
      setIsSaving(true);
      try {
        await onSave();
        setIsProjectSaved(true);
      } catch (error) {
        alert('Ошибка при сохранении проекта. Попробуйте еще раз.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const detectEmailProvider = (): 'gmail' | 'mailru' | 'yandex' | null => {
    const userEmail = localStorage.getItem('user_email');

    if (userEmail) {
      if (userEmail.includes('@gmail.com')) return 'gmail';
      if (userEmail.includes('@mail.ru') || userEmail.includes('@bk.ru') || userEmail.includes('@list.ru')) return 'mailru';
      if (userEmail.includes('@yandex.ru') || userEmail.includes('@ya.ru')) return 'yandex';
    }

    return null;
  };

  const getEmailUrl = (provider: string): string => {
    const subject = encodeURIComponent(`Приглашение просмотреть проект: ${projectName}`);
    const body = encodeURIComponent(`Здравствуйте!\n\nОтправляю Вам свой проект: ${projectName}.\n\nСсылка на проект: ${shareUrl}\n\nС уважением.`);

    switch(provider) {
      case 'gmail':
        // Gmail использует стандартный mailto с добавлением параметров
        // или открывает compose с заполненными полями через параметры
        return `https://mail.google.com/mail/?view=cm&fs=1&to=&su=${subject}&body=${body}`;
      case 'mailru':
        return `https://e.mail.ru/compose/?subject=${subject}&body=${body}`;
      case 'yandex':
        return `https://mail.yandex.ru/compose?subject=${subject}&body=${body}`;
      default:
        return `mailto:?subject=${subject}&body=${body}`;
    }
  };

  const handleEmailSend = async () => {
    // Сначала копируем ссылку в буфер обмена
    await copyToClipboard();

    // Определяем провайдера
    const provider = detectEmailProvider();

    if (provider === 'gmail') {
      // Для Gmail открываем compose окно
      window.open(getEmailUrl('gmail'), '_blank');
    } else if (provider === 'mailru') {
      window.open(getEmailUrl('mailru'), '_blank');
    } else if (provider === 'yandex') {
      window.open(getEmailUrl('yandex'), '_blank');
    } else {
      // Если провайдер не определен, показываем выбор
      setShowEmailOptions(true);
    }
  };

  const handleManualProviderSelect = (provider: string) => {
    window.open(getEmailUrl(provider), '_blank');
    setShowEmailOptions(false);
  };

  if (!isOpen) return null;

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal-content" onClick={e => e.stopPropagation()}>
        <div className="share-modal-header">
          <h3>Поделиться проектом</h3>
          <button className="share-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="share-modal-body">
          {!isProjectSaved ? (
            <>
              <div className="share-warning">
                <svg className="warning-icon" viewBox="0 0 24 24" width="24" height="24">
                  <path fill="#ff9800" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                <p>Проект ещё не сохранён в облаке. Чтобы поделиться, необходимо сначала сохранить проект.</p>
              </div>
              <div className="share-actions">
                <button onClick={onClose} className="share-cancel-btn">
                  Отмена
                </button>
                <button
                  onClick={handleSaveAndShare}
                  className="share-save-btn"
                  disabled={isSaving}
                >
                  {isSaving ? 'Сохранение...' : 'Сохранить и продолжить'}
                </button>
              </div>
            </>
          ) : showEmailOptions ? (
            <>
              <div className="email-provider-selection">
                <h4>Выберите почтовый сервис</h4>
                <div className="provider-buttons">
                  <button onClick={() => handleManualProviderSelect('gmail')} className="provider-btn gmail">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Gmail
                  </button>
                  <button onClick={() => handleManualProviderSelect('mailru')} className="provider-btn mailru">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path fill="#168DE2" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 13c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5z"/>
                    </svg>
                    Mail.ru
                  </button>
                  <button onClick={() => handleManualProviderSelect('yandex')} className="provider-btn yandex">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path fill="#FC3F1D" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                    </svg>
                    Яндекс
                  </button>
                </div>
                <button onClick={() => setShowEmailOptions(false)} className="back-btn">
                  ← Назад
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="share-description">
                Отправьте эту ссылку друзьям или коллегам. Они смогут просмотреть ваш проект, но не смогут его редактировать.
              </p>

              <div className="share-url-container">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="share-url-input"
                  onClick={e => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={copyToClipboard}
                  className={`share-copy-btn ${copySuccess ? 'success' : ''}`}
                >
                  {copySuccess ? '✓ Скопировано!' : 'Копировать'}
                </button>
              </div>

              <div className="share-email-section">
                <button onClick={handleEmailSend} className="share-email-btn">
                  <svg viewBox="0 0 24 24" width="20" height="20">
                    <path fill="currentColor" d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                  </svg>
                  Отправить по email
                </button>
              </div>

              <div className="share-actions">
                <button onClick={onClose} className="share-close-btn">
                  Закрыть
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
