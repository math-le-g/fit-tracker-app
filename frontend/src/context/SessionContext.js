import React, { createContext, useState, useContext, useEffect, useRef } from 'react';

const SessionContext = createContext();

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
};

export const SessionProvider = ({ children }) => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const intervalRef = useRef(null);

  // Démarrer la séance
  const startSession = () => {
    if (!isSessionActive) {
      setIsSessionActive(true);
      setSessionTime(0);
    }
  };

  // Arrêter la séance
  const endSession = () => {
    setIsSessionActive(false);
    setSessionTime(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Timer qui tourne en permanence
  useEffect(() => {
    if (isSessionActive) {
      intervalRef.current = setInterval(() => {
        setSessionTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isSessionActive]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SessionContext.Provider
      value={{
        isSessionActive,
        sessionTime,
        formattedTime: formatTime(sessionTime),
        startSession,
        endSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};