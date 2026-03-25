import React from 'react';

const FigmaEmbed = ({ figmaUrl, width = '100%', height = '400px' }) => {
  // Конвертируем обычный URL Figma в embed URL
  const getEmbedUrl = (url) => {
    if (!url) return '';
    
    // Если URL уже embed, возвращаем как есть
    if (url.includes('embed')) return url;
    
    // Конвертируем обычный URL в embed URL
    const figmaId = url.match(/figma\.com\/file\/([a-zA-Z0-9]+)/);
    if (figmaId) {
      return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  const embedUrl = getEmbedUrl(figmaUrl);

  if (!embedUrl) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
        <p className="text-red-400 text-sm">Figma URL не указан</p>
      </div>
    );
  }

  return (
    <div className="figma-embed-container">
      <iframe
        src={embedUrl}
        width={width}
        height={height}
        style={{
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          background: 'rgba(0, 0, 0, 0.3)'
        }}
        allowfullscreen
      />
    </div>
  );
};

export default FigmaEmbed;
