import Logining from "../components/Logining/Logining";
import Logo from "../components/logo/Logo";
import '../style/LoginingSystem/LoginingSystem.css'

function LoginindSystem() {
  return (
    <div className="App">
      <div className="head">
        <div className="App-header">
          <Logo />
        </div>
      </div>
      <div className="main">
        <main className="container">
          <Logining />
        </main>
      </div>
    </div>
  )
}

export default LoginindSystem;
