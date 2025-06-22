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
      <div className='containerImg'>
        <img className='imgExample' src={image} alt="Пример" />
      </div>
      <div className='description'>
        <label className='textExample'>
          Возьмите за основу этот макет, или переделайте его полностью под себя
        </label>
        <div className='containerBtn'>
          <button className='buttonHeader' onClick={handleTemplateSelect}>
            Открыть макет
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExampleCards;
