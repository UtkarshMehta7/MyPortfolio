import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './index.css';
import Portfolio from './pages/Portfolio';
import Admin from './pages/Admin';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Portfolio />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
