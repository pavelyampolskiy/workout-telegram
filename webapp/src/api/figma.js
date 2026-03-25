// Figma API для получения данных из дизайн-системы

const FIGMA_API_TOKEN = import.meta.env.VITE_FIGMA_TOKEN || 'YOUR_FIGMA_TOKEN';
const FIGMA_FILE_ID = import.meta.env.VITE_FIGMA_FILE_ID || 'YOUR_FILE_ID';

// Базовый URL для Figma API
const FIGMA_API_BASE = 'https://api.figma.com/v1';

// Заголовки для запросов
const getHeaders = () => ({
  'X-Figma-Token': FIGMA_API_TOKEN,
  'Content-Type': 'application/json'
});

// Получение информации о файле
export const getFigmaFile = async () => {
  try {
    const response = await fetch(`${FIGMA_API_BASE}/files/${FIGMA_FILE_ID}`, {
      headers: getHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching Figma file:', error);
    throw error;
  }
};

// Получение стилей из файла
export const getFigmaStyles = async () => {
  try {
    const response = await fetch(`${FIGMA_API_BASE}/files/${FIGMA_FILE_ID}/styles`, {
      headers: getHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching Figma styles:', error);
    throw error;
  }
};

// Получение компонентов
export const getFigmaComponents = async () => {
  try {
    const response = await fetch(`${FIGMA_API_BASE}/files/${FIGMA_FILE_ID}/components`, {
      headers: getHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching Figma components:', error);
    throw error;
  }
};

// Получение конкретного узла по ID
export const getFigmaNode = async (nodeId) => {
  try {
    const response = await fetch(`${FIGMA_API_BASE}/files/${FIGMA_FILE_ID}/nodes?ids=${nodeId}`, {
      headers: getHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching Figma node:', error);
    throw error;
  }
};

// Извлечение цветов из стилей
export const extractColorsFromStyles = (styles) => {
  const colors = {};
  
  styles.forEach(style => {
    if (style.style_type === 'FILL') {
      // Конвертация Figma RGB в HEX
      const fills = style.raw?.fills || [];
      if (fills.length > 0 && fills[0].type === 'SOLID') {
        const { r, g, b } = fills[0].color;
        const hex = `#${Math.round(r * 255).toString(16).padStart(2, '0')}${Math.round(g * 255).toString(16).padStart(2, '0')}${Math.round(b * 255).toString(16).padStart(2, '0')}`;
        colors[style.name] = hex;
      }
    }
  });
  
  return colors;
};

// Извлечение текстовых стилей
export const extractTextStyles = (styles) => {
  const textStyles = {};
  
  styles.forEach(style => {
    if (style.style_type === 'TEXT') {
      textStyles[style.name] = {
        fontFamily: style.raw?.fontName?.family || 'Inter',
        fontSize: style.raw?.fontSize || 16,
        fontWeight: style.raw?.fontWeight || 400,
        lineHeight: style.raw?.lineHeight?.value || 1.2,
        letterSpacing: style.raw?.letterSpacing?.value || 0,
        color: style.raw?.fills?.[0]?.color || null
      };
    }
  });
  
  return textStyles;
};

// Генерация CSS переменных из Figma стилей
export const generateCSSVariables = (styles) => {
  const colors = extractColorsFromStyles(styles);
  const textStyles = extractTextStyles(styles);
  
  let cssVars = ':root {\n';
  
  // Цветовые переменные
  Object.entries(colors).forEach(([name, color]) => {
    const cssVar = `--color-${name.toLowerCase().replace(/\s+/g, '-')}: ${color};`;
    cssVars += `  ${cssVar}\n`;
  });
  
  cssVars += '\n';
  
  // Текстовые переменные
  Object.entries(textStyles).forEach(([name, style]) => {
    cssVars += `  --text-${name.toLowerCase().replace(/\s+/g, '-')}: ${style.fontSize}px/${style.lineHeight} ${style.fontFamily};\n`;
  });
  
  cssVars += '}';
  
  return cssVars;
};
