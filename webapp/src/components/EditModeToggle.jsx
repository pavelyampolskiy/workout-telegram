import { useState } from 'react';

export default function EditModeToggle({ enabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`fixed top-20 right-5 z-50 px-4 py-2 rounded-full font-bebas text-sm tracking-wider transition-all duration-200 ${
        enabled 
          ? 'bg-white text-black shadow-lg shadow-white/20' 
          : 'bg-white/10 text-white border border-white/20'
      }`}
      style={{
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}
    >
      {enabled ? 'Done' : 'Edit Layout'}
    </button>
  );
}
