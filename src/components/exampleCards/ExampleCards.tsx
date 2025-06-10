import '../../style/ExampleCards/ExampleCards.css';

interface ExampleCardsProps {
  image: string;
}

const ExampleCards = ({ image }: ExampleCardsProps) => {
  return (
    <div className='containerExample'>
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
