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
    console.log('P')
    if (templateId) {
      const { data, error } = await supabase
        .from('templates')
        .select('html, css, js')
        .eq('id', templateId)
        .single();

      if (!error && data) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('user_projects')
            .upsert({
              user_id: user.id,
              html: data.html,
              css: data.css,
              js: data.js,
              updated_at: new Date()
            }, {
              onConflict: 'user_id'
            });
        }
      }
    }
    handleNavigate(navigate, createPath);
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
