import Logo from "../components/logo/Logo";
import Registration from "../components/Registrstion/Registration";

function RegistrationSystem() {
  return (
    <div className="App">
      <div className="head">
        <div className="App-header">
          <Logo />
        </div>
      </div>
      <div className="main">
        <main className="container">
          <Registration />
        </main>
      </div>
    </div>
  )
}

export default RegistrationSystem;
