import { useNavigate } from 'react-router-dom';
import { handleNavigate } from '../../functions/Navigate/Navigate';
import '../../style/ExampleCards/ExampleCards.css';

interface ExampleCardsProps {
  image: string;
  createPath?: string;
}

const ExampleCards = ({ image, createPath='dev' }: ExampleCardsProps) => {
  const navigate = useNavigate();

  return (
    <div className='containerExample' onClick={() => handleNavigate(navigate, createPath)}>
      <div >
        <img className='imgExample' src={image} alt="Пример" />
      </div>
      <div>
        <label className='textExample'>
          Возьмите за основу этот макет, или переделайте его полностью под себя
        </label>
      </div>
    </div>
  );
};

export default ExampleCards;
