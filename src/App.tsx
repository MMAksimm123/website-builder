import React from 'react';
import './App.css';
import CustomHeader from './components/customHeader/customHeader';
import PresentBlock from './components/PresentBlock/PresentBlock';

function App() {
  return (
    <div className="App">
      <div className='head'>
        <header className="App-header">
          <CustomHeader />
        </header>
      </div>
      <div className='main'>
        <main className='App-main'>
          <PresentBlock />
        </main>
      </div>
    </div>
  );
}

export default App;
