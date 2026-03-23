import { useState, useEffect } from 'react';
import { getFigmaFile, getFigmaStyles, generateCSSVariables } from '../api/figma';

export const useFigma = () => {
  const [figmaData, setFigmaData] = useState(null);
  const [styles, setStyles] = useState(null);
  const [cssVariables, setCssVariables] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadFigmaData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Загружаем информацию о файле
      const fileData = await getFigmaFile();
      setFigmaData(fileData);
      
      // Загружаем стили
      const stylesData = await getFigmaStyles();
      setStyles(stylesData);
      
      // Генерируем CSS переменные
      const cssVars = generateCSSVariables(stylesData.styles);
      setCssVariables(cssVars);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFigmaData();
  }, []);

  return {
    figmaData,
    styles,
    cssVariables,
    loading,
    error,
    refetch: loadFigmaData
  };
};
