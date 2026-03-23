import React, { useState } from 'react';
import { useApp } from '../App';
import ScreenBg from '../ScreenBg';
import { PAGE_HEADING_STYLE, CARD_BG } from '../constants';
import FigmaEmbed from '../components/FigmaEmbed';
import { useFigma } from '../hooks/useFigma';
import { Spinner } from '../components/Spinner';

const FigmaScreen = () => {
  const { navigate } = useApp();
  const { figmaData, styles, cssVariables, loading, error } = useFigma();
  const [activeTab, setActiveTab] = useState('preview');

  if (loading) {
    return (
      <div className="min-h-screen relative flex flex-col overflow-hidden">
        <ScreenBg image="/gym-bg.jpg" overlay="bg-black/65" blur={3} scale={1} />
        <div className="relative z-10 flex-1 min-h-0 p-5 safe-top-lg overflow-y-auto flex items-center justify-center">
          <div className="text-center">
            <Spinner size={40} />
            <p className="text-white/60 mt-4 font-bebas">Загрузка Figma данных...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen relative flex flex-col overflow-hidden">
        <ScreenBg image="/gym-bg.jpg" overlay="bg-black/65" blur={3} scale={1} />
        <div className="relative z-10 flex-1 min-h-0 p-5 safe-top-lg overflow-y-auto">
          <h1 className="font-bebas text-white pt-6 mb-5" style={PAGE_HEADING_STYLE}>Figma Integration</h1>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-400 text-sm">Ошибка: {error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-bebas"
            >
              Повторить
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      <ScreenBg image="/gym-bg.jpg" overlay="bg-black/65" blur={3} scale={1} />
      <div className="relative z-10 flex-1 min-h-0 p-5 safe-top-lg overflow-y-auto">
        <h1 className="font-bebas text-white pt-6 mb-5" style={PAGE_HEADING_STYLE}>Figma Integration</h1>
        
        {/* Табы */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 rounded-lg font-bebas text-sm transition-colors ${
              activeTab === 'preview' 
                ? 'bg-white/20 text-white' 
                : 'bg-white/10 text-white/60 hover:bg-white/15'
            }`}
          >
            Preview
          </button>
          <button
            onClick={() => setActiveTab('styles')}
            className={`px-4 py-2 rounded-lg font-bebas text-sm transition-colors ${
              activeTab === 'styles' 
                ? 'bg-white/20 text-white' 
                : 'bg-white/10 text-white/60 hover:bg-white/15'
            }`}
          >
            Styles
          </button>
          <button
            onClick={() => setActiveTab('css')}
            className={`px-4 py-2 rounded-lg font-bebas text-sm transition-colors ${
              activeTab === 'css' 
                ? 'bg-white/20 text-white' 
                : 'bg-white/10 text-white/60 hover:bg-white/15'
            }`}
          >
            CSS Variables
          </button>
        </div>

        {/* Контент табов */}
        <div className="rounded-xl p-5" style={{ background: CARD_BG }}>
          {activeTab === 'preview' && (
            <div>
              <h2 className="font-bebas text-white/80 text-lg mb-4">Figma Preview</h2>
              <div className="mb-4">
                <label className="text-white/60 text-sm font-bebas block mb-2">
                  Figma URL:
                </label>
                <input
                  type="text"
                  placeholder="https://www.figma.com/file/..."
                  className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm font-bebas"
                  onChange={(e) => {
                    // Можно сохранить URL в localStorage
                    localStorage.setItem('figmaUrl', e.target.value);
                  }}
                  defaultValue={localStorage.getItem('figmaUrl') || ''}
                />
              </div>
              <FigmaEmbed 
                figmaUrl={localStorage.getItem('figmaUrl') || ''}
                height="500px"
              />
            </div>
          )}

          {activeTab === 'styles' && (
            <div>
              <h2 className="font-bebas text-white/80 text-lg mb-4">Figma Styles</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-bebas text-white/60 text-sm mb-2">File Info:</h3>
                  <div className="bg-black/30 rounded-lg p-3">
                    <p className="text-white/40 text-sm font-bebas">
                      Name: {figmaData?.name || 'N/A'}
                    </p>
                    <p className="text-white/40 text-sm font-bebas">
                      Last Modified: {figmaData?.lastModified ? new Date(figmaData.lastModified).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-bebas text-white/60 text-sm mb-2">Styles ({styles?.styles?.length || 0}):</h3>
                  <div className="bg-black/30 rounded-lg p-3 max-h-64 overflow-y-auto">
                    {styles?.styles?.map((style, index) => (
                      <div key={index} className="mb-2 pb-2 border-b border-white/10 last:border-0">
                        <p className="text-white/60 text-xs font-bebas">{style.name}</p>
                        <p className="text-white/40 text-xs font-bebas">{style.style_type}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'css' && (
            <div>
              <h2 className="font-bebas text-white/80 text-lg mb-4">Generated CSS Variables</h2>
              <div className="bg-black/50 rounded-lg p-4">
                <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap">
                  {cssVariables || '/* No CSS variables generated */'}
                </pre>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(cssVariables);
                  alert('CSS variables copied to clipboard!');
                }}
                className="mt-4 px-4 py-2 bg-white/20 text-white rounded-lg text-sm font-bebas"
              >
                Copy CSS
              </button>
            </div>
          )}
        </div>

        {/* Кнопка назад */}
        <button
          onClick={() => navigate('home')}
          className="mt-6 w-full py-3 bg-white/10 text-white/60 rounded-xl font-bebas hover:bg-white/20 transition-colors"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default FigmaScreen;
