import { useState } from 'react';

export default function EditModeToggle({ enabled, onToggle }) {
  return (
    <div
      onClick={onToggle}
      className={`w-full py-3 px-4 rounded-xl font-bebas text-sm tracking-wider transition-all duration-200 cursor-pointer ${
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
    </div>
  );
}
