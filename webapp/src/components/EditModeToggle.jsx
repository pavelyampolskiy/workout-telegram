import { useState } from 'react';

export default function EditModeToggle({ enabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`px-6 py-3 rounded-xl font-bebas text-sm tracking-wider transition-all duration-200 ${
        enabled 
          ? 'bg-white text-black shadow-lg shadow-white/20' 
          : 'bg-white/10 text-white'
      }`}
      style={{
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}
    >
      {enabled ? 'Done' : 'Edit Dashboard'}
    </button>
  );
}
