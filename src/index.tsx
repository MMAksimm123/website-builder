import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import LoginindSystem from './panel/LoginingSystem';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RegistrationSystem from './panel/RegistrationSystem';
import Main from './panel/Main';
import DevArea from './panel/DevArea';
import EditProgect from './panel/EditProgect';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/login" element={<LoginindSystem />} />
        <Route path='/registration' element={<RegistrationSystem />} />
        <Route path='/main' element={<Main />} />
        <Route path='/dev' element={<DevArea />} />
        <Route path='/edit/:id' element={<EditProgect />} />
      </Routes>
    </Router>
  </React.StrictMode>
);

reportWebVitals();
