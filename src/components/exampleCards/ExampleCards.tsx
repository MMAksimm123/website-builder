import { useNavigate } from 'react-router-dom';
import '../../style/ExampleCards/ExampleCards.css';

interface ExampleCardsProps {
  image: string;
  templateData: { html: string; css: string; js: string };
}

const ExampleCards = ({ image, templateData }: ExampleCardsProps) => {
  const navigate = useNavigate();

  const handleTemplateSelect = () => {
    navigate('/dev', { state: { initialCode: templateData } });
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
