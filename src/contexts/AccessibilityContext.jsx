import React, { createContext, useContext, useState, useEffect } from 'react';

const AccessibilityContext = createContext();

export function AccessibilityProvider({ children }) {
  const [fontSize, setFontSize] = useState(15);
  const [fontMode, setFontMode] = useState('sans');
  const [darkMode, setDarkMode] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [screenReaderMode, setScreenReaderMode] = useState(false);
  const [lineSpacing, setLineSpacing] = useState(1.5);

  useEffect(() => {
    document.documentElement.style.setProperty('--font-size', `${fontSize}px`);
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.className = [
      darkMode ? 'dark' : '',
      highContrast ? 'high-contrast' : '',
      `font-mode-${fontMode}`,
    ].filter(Boolean).join(' ');
  }, [darkMode, highContrast, fontMode]);

  useEffect(() => {
    document.body.style.lineHeight = lineSpacing;
  }, [lineSpacing]);

  return (
    <AccessibilityContext.Provider value={{
      fontSize, setFontSize, fontMode, setFontMode,
      darkMode, setDarkMode, highContrast, setHighContrast,
      reducedMotion, setReducedMotion, screenReaderMode, setScreenReaderMode,
      lineSpacing, setLineSpacing,
    }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  return useContext(AccessibilityContext);
}
