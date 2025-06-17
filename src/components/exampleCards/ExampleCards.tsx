import { useNavigate } from 'react-router-dom';
import { handleNavigate } from '../../functions/Navigate/Navigate';
import { supabase } from '../../database/supabaseClient';
import '../../style/ExampleCards/ExampleCards.css';

interface ExampleCardsProps {
  image: string;
  createPath?: string;
  templateId?: number;
}

const ExampleCards = ({ image, createPath='dev', templateId }: ExampleCardsProps) => {
  const navigate = useNavigate();

  const handleTemplateSelect = async () => {
  if (templateId) {
    const { data, error } = await supabase
      .from('templates')
      .select('html, css, js')
      .eq('id', templateId)
      .single();

    if (!error && data) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Перенаправляем в DevArea с данными шаблона
        navigate('/dev', {
          state: {
            initialCode: {
              html: data.html || '',
              css: data.css || '',
              js: data.js || ''
            }
          }
        });
      }
    }
  }
};

  return (
    <div className='containerExample'>
      <div>
        <img className='imgExample' src={image} alt="Пример" />
      </div>
      <div>
        <label className='textExample'>
          Возьмите за основу этот макет, или переделайте его полностью под себя
        </label>
        <button onClick={handleTemplateSelect}>
          Открыть макет
        </button>
      </div>
    </div>
  );
};

export default ExampleCards;
