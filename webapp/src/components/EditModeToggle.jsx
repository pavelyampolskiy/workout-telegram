import { useState } from 'react';

export default function EditModeToggle({ enabled, onToggle }) {
  return (
    <div
      onClick={onToggle}
      className="font-bebas text-sm tracking-wider cursor-pointer transition-all duration-200 text-center"
      style={{
        color: enabled ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
        textShadow: enabled ? '0 0 10px rgba(255, 255, 255, 0.5)' : 'none'
      }}
    >
      {enabled ? 'Done' : 'Edit Dashboard'}
    </div>
  );
}
