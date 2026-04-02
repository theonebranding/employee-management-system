import React from 'react';
import { ToastContainer } from 'react-toastify';

const AppToastContainer = ({ autoClose = 1000 }) => (
  <ToastContainer
    toastClassName="bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text ring-1 ring-light-border dark:ring-dark-border"
    position="top-right"
    pauseOnHover={false}
    limit={1}
    closeOnClick={true}
    autoClose={autoClose}
  />
);

export default AppToastContainer;
