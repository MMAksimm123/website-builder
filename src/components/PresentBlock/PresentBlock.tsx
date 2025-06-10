import Ilustration from '../../picture/Illustration.svg';
import '../../style/presentBlock/PresentBlock.css'

const PresentBlock = ({}) => {
  return (
    <div className='containerInfo'>
      <div className='blockText'>
        <h1 className='blockTitle'>Создайте своё портфолио!</h1>
        <label className='blockLabel'>
          Больше не нужно тратить часы на сложные конструкторы! Наш сервис поможет вам быстро создать стильный лендинг для портфолио — без дизайнерских навыков и лишних затрат. Выбирайте шаблоны, добавляйте работы и запускайте сайт в один клик. Идеально для дизайнеров, фотографов, копирайтеров и всех, кто хочет эффектно презентовать свои проекты.
        </label>
      </div>

        <img src={Ilustration} />
    </div>
  )
}

export default PresentBlock;
