import './index.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App.jsx';
import { AuthProvider } from './context/authContext.jsx';
import { LocationProvider } from './context/locationContext.jsx';
import { ThemeProvider } from './context/themeContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename="/">
      <ThemeProvider>
        <LocationProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </LocationProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
