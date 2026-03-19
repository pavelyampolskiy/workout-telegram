import { useState, useRef, useEffect } from 'react';
import './DragDropGrid.css';

export default function DragDropGrid({ items, onLayoutChange, editMode = false }) {
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);
  const [touchStart, setTouchStart] = useState(null);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const gridRef = useRef(null);

  // Загрузка сохраненной расстановки
  useEffect(() => {
    const savedLayout = loadGridLayout();
    if (savedLayout) {
      onLayoutChange(savedLayout);
    }
  }, []);

  // Touch event handlers
  const handleTouchStart = (e, item) => {
    if (!editMode) return;
    
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY, time: Date.now() });
    
    // Предотвращаем скролл при начале drag
    e.preventDefault();
    
    // Long press detection
    const timer = setTimeout(() => {
      setDraggedItem(item);
      e.target.classList.add('dragging');
      
      // Блокируем скролл на всем документе
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      document.body.classList.add('no-scroll');
    }, 300); // 300ms for long press
    
    setLongPressTimer(timer);
  };

  const handleTouchMove = (e) => {
    if (!editMode || !draggedItem) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const touch = e.touches[0];
    
    // Find drop target
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const gridItem = elementBelow?.closest('[data-grid-item]');
    
    if (gridItem) {
      const itemId = gridItem.dataset.gridItem;
      if (itemId !== draggedItem.id) {
        setDragOverItem(itemId);
      }
    }
  };

  const handleTouchEnd = (e) => {
    // Возвращаем скролл
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    document.body.classList.remove('no-scroll');
    
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    if (draggedItem && dragOverItem) {
      // Reorder items
      const newLayout = reorderItems(items, draggedItem.id, dragOverItem);
      onLayoutChange(newLayout);
      saveGridLayout(newLayout);
    }
    
    // Clean up
    setDraggedItem(null);
    setDragOverItem(null);
    setTouchStart(null);
    
    // Remove dragging class
    document.querySelectorAll('.dragging').forEach(el => {
      el.classList.remove('dragging');
    });
  };

  const reorderItems = (items, draggedId, targetId) => {
    const draggedIndex = items.findIndex(item => item.id === draggedId);
    const targetIndex = items.findIndex(item => item.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return items;
    
    const newItems = [...items];
    const [draggedItem] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, draggedItem);
    
    return newItems;
  };

  const saveGridLayout = (layout) => {
    try {
      localStorage.setItem('grid_layout', JSON.stringify({
        layout,
        timestamp: Date.now(),
        version: '1.0'
      }));
    } catch (error) {
      console.error('Failed to save grid layout:', error);
    }
  };

  const loadGridLayout = () => {
    try {
      const saved = localStorage.getItem('grid_layout');
      if (saved) {
        const { layout } = JSON.parse(saved);
        return layout;
      }
    } catch (error) {
      console.error('Failed to load grid layout:', error);
    }
    return null;
  };

  const getGridItemClass = (item) => {
    let baseClass = 'grid-item card-press rounded-xl transition-all duration-200';
    
    if (editMode) {
      baseClass += ' edit-mode';
    }
    
    if (draggedItem?.id === item.id) {
      baseClass += ' dragging';
    }
    
    if (dragOverItem === item.id && draggedItem?.id !== item.id) {
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
      background: 'rgba(255,255,255,0.03)',
      minHeight: '80px',
      touchAction: editMode ? 'none' : 'auto'
    };
    
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
      {items.map((item) => (
        <div
          key={item.id}
          data-grid-item={item.id}
          className={getGridItemClass(item)}
          style={getItemStyle(item)}
          onTouchStart={(e) => handleTouchStart(e, item)}
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
            top: 5px;
            right: 5px;
            color: rgba(255,255,255,0.3);
            font-size: 12px;
            pointer-events: none;
          }
          
          .dragging {
            opacity: 0.5;
            transform: scale(1.05);
            z-index: 1000;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          }
          
          .drop-target {
            background: rgba(255,255,255,0.1) !important;
            border: 2px dashed rgba(255,255,255,0.3);
            transform: scale(0.95);
          }
        `}</style>
      )}
    </div>
  );
}
