import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext({ isDark: false, toggleTheme: () => {} });

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('skoolz_theme') === 'dark');

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('data-theme', isDark ? 'dark' : 'light');
    html.style.colorScheme = isDark ? 'dark' : 'light';
    localStorage.setItem('skoolz_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme: () => setIsDark(v => !v) }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
