import { useNavigate } from "react-router-dom";
import LogoBtn from '../../logo.svg';
import '../../style/Logo/Logo.css'
import { handleNavigate } from "../../functions/Navigate/Navigate";

interface CustomLogoProps {
  createSitePath?: string;
}

const Logo = ({ createSitePath = "" }: CustomLogoProps) => {
  const navigate = useNavigate();

  return (
    <div className="containerLogo">
      <button onClick={() => handleNavigate(navigate, createSitePath)} className="logoButton">
        <img src={LogoBtn} className='logoHeader'/>
      </button>
    </div>
  )
}

export default Logo;
