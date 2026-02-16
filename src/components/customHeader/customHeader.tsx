import Logo from '../../logo.svg';
import '../../style/customHeader/customHeader.css';
import { handleNavigate } from '../../functions/Navigate/Navigate';
import { useNavigate } from "react-router-dom";

interface CustomHeaderProps {
  createSitePath?: string;
}

const CustomHeader = ({ createSitePath = "login" }: CustomHeaderProps) => {
    const navigate = useNavigate();

    return (
      <div className="headerLine">
        <img src={Logo} className='logoHeader'/>
        <button
          onClick={() => handleNavigate(navigate, createSitePath)}
          className='buttonHeaderstart'
        >
          Создать сайт
        </button>
      </div>
    )
}

export default CustomHeader;
