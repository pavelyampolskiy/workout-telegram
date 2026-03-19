import { useState, useRef, useEffect } from 'react';
import './DragDropGrid.css';

export default function DragDropGrid({ items, onLayoutChange, editMode = false }) {
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [touchStart, setTouchStart] = useState(null);
  const gridRef = useRef(null);

  // Сохранение при изменении layout
  useEffect(() => {
    if (items.length > 0) {
      try {
        localStorage.setItem('grid_layout', JSON.stringify(items));
      } catch (error) {
        console.error('Failed to save layout:', error);
      }
    }
  }, [items]);

  // Touch event handlers - сразу drag без long press
  const handleTouchStart = (e, item, index) => {
    if (!editMode || item.draggable === false) return;
    
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY, time: Date.now() });
    
    // Сразу включаем drag режим без задержки
    setDraggedItem({ ...item, originalIndex: index });
    e.target.classList.add('dragging');
    
    // Блокируем скролл
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  };

  const handleTouchMove = (e) => {
    if (!editMode || !draggedItem) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    
    // Определяем направление движения
    if (touchStart) {
      const deltaX = touch.clientX - touchStart.x;
      const deltaY = touch.clientY - touchStart.y;
      
      // Определяем над каким элементом находимся
      const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
      if (elementBelow) {
        const gridItem = elementBelow.closest('.grid-item');
        if (gridItem) {
          const index = parseInt(gridItem.dataset.index);
          if (index !== undefined && index !== dragOverIndex) {
            setDragOverIndex(index);
            
            // Сразу переставляем элементы как на iPhone
            const newItems = [...items];
            const draggedIndex = draggedItem.originalIndex;
            
            if (index !== draggedIndex) {
              // Убираем dragged элемент
              const [removed] = newItems.splice(draggedIndex, 1);
              
              // Вставляем на новую позицию
              if (index < draggedIndex) {
                // Двигаем вверх
                newItems.splice(index, 0, removed);
              } else {
                // Двигаем вниз
                newItems.splice(index, 0, removed);
              }
              
              // Обновляем draggedItem с новым индексом
              setDraggedItem({ ...removed, originalIndex: index });
              onLayoutChange(newItems);
            }
          }
        }
      }
    }
  };

  const handleTouchEnd = (e) => {
    // Возвращаем скролл
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    
    // Перестановка уже происходит в handleTouchMove, здесь только очистка
    
    // Clean up
    setDraggedItem(null);
    setDragOverIndex(null);
    setTouchStart(null);
    
    // Remove dragging class
    document.querySelectorAll('.dragging').forEach(el => {
      el.classList.remove('dragging');
    });
  };

  const getGridItemClass = (item, index) => {
    let baseClass = 'grid-item card-press rounded-xl transition-all duration-200';
    
    if (editMode && item.draggable !== false) {
      baseClass += ' edit-mode';
    }
    
    if (draggedItem?.id === item.id) {
      baseClass += ' dragging';
    }
    
    if (dragOverIndex === index && draggedItem?.id !== item.id) {
      baseClass += ' drop-target';
    }
    
    // Size classes
    if (item.size?.cols === 2) {
      baseClass += ' col-span-2';
    }
    if (item.size?.rows === 2) {
      baseClass += ' row-span-2';
    }
    
    return baseClass;
  };

  const getItemStyle = (item) => {
    const baseStyle = {
      minHeight: '80px',
      touchAction: editMode ? 'pan-y' : 'auto'
    };
    
    // Применяем фон только для обычных элементов, не для control
    if (item.type !== 'control') {
      baseStyle.background = 'rgba(255,255,255,0.03)';
    }
    
    // Custom sizing
    if (item.size) {
      if (item.size.customHeight) {
        baseStyle.minHeight = item.size.customHeight;
      }
      if (item.size.customPadding) {
        baseStyle.padding = item.size.customPadding;
      }
    }
    
    return baseStyle;
  };

  return (
    <div 
      ref={gridRef}
      className="grid-container"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1rem',
        maxHeight: editMode ? '70vh' : 'none',
        overflowY: editMode ? 'auto' : 'visible'
      }}
    >
      {items.map((item, index) => (
        <div
          key={item.id}
          data-grid-item={item.id}
          data-grid-index={index}
          className={getGridItemClass(item, index)}
          style={getItemStyle(item)}
          onTouchStart={(e) => handleTouchStart(e, item, index)}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {item.content}
        </div>
      ))}
      
      {editMode && (
        <style>{`
          .edit-mode::after {
            content: '⋮⋮';
            position: absolute;
            top: 8px;
            right: 8px;
            color: rgba(255,255,255,0.3);
            font-size: 12px;
            pointer-events: none;
          }
          
          .dragging {
            opacity: 0.8;
            transform: scale(1.05);
            z-index: 1000;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          }
          
          .drop-target {
            background: rgba(255,255,255,0.1) !important;
            transform: scale(0.95);
          }
        `}</style>
      )}
    </div>
  );
}
