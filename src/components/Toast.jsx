// src/components/Toast.jsx
import React, { useState, useEffect } from 'react';
import './Toast.css';

const Toast = ({ message, type, duration = 3000, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, duration);

      // This timeout is for the onDismiss callback, after the fade-out animation
      const dismissTimer = setTimeout(() => {
        onDismiss();
      }, duration + 400); // 400ms for fade-out animation

      return () => {
        clearTimeout(timer);
        clearTimeout(dismissTimer);
      };
    } else {
      setIsVisible(false); // Ensure it's hidden if message is cleared externally
    }
  }, [message, type, duration, onDismiss]); // Re-run if any of these change

  if (!message) { // If no message, don't render anything (or rely on isVisible for CSS)
    return null;
  }

  return (
    <div className={`toast ${type === 'error' ? 'toast-error' : 'toast-success'} ${isVisible ? 'show' : ''}`}>
      {message}
    </div>
  );
};

export default Toast;