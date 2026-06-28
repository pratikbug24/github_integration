import React from "react";

/**
 * MobileResponsive - A wrapper component for responsive layouts
 * Provides responsive grid and flex utilities
 */

// Default wrapper component
export default function MobileResponsive({ children, className = "" }) {
  return (
    <div className={`w-full ${className}`}>
      {children}
    </div>
  );
}

export function ResponsiveGrid({ children, cols = 1, mdCols = 2, lgCols = 3, gap = 4, className = "" }) {
  const colClasses = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  };

  const mdColClasses = {
    1: "md:grid-cols-1",
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
  };

  const lgColClasses = {
    1: "lg:grid-cols-1",
    2: "lg:grid-cols-2",
    3: "lg:grid-cols-3",
    4: "lg:grid-cols-4",
  };

  return (
    <div className={`grid ${colClasses[cols] || "grid-cols-1"} ${mdColClasses[mdCols] || "md:grid-cols-2"} ${lgColClasses[lgCols] || "lg:grid-cols-3"} gap-${gap} ${className}`}>
      {children}
    </div>
  );
}

export function ResponsiveFlex({ children, direction = "col", mdDirection = "row", gap = 4, className = "" }) {
  return (
    <div className={`flex flex-${direction} md:flex-${mdDirection} gap-${gap} ${className}`}>
      {children}
    </div>
  );
}

export function HideOnMobile({ children, className = "" }) {
  return <div className={`hidden md:block ${className}`}>{children}</div>;
}

export function ShowOnMobile({ children, className = "" }) {
  return <div className={`block md:hidden ${className}`}>{children}</div>;
}

/**
 * MobileCard - A card component optimized for mobile
 */
export function MobileCard({ children, className = "", onClick }) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 ${
        onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

/**
 * MobileTabs - Bottom navigation tabs for mobile
 */
export function MobileTabs({ tabs, activeTab, onTabChange }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 md:hidden z-40 safe-area-pb">
      <div className="flex justify-around items-center h-16">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              activeTab === tab.id
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {tab.icon}
            <span className="text-xs mt-1">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * MobileHeader - A header component optimized for mobile
 */
export function MobileHeader({ title, subtitle, leftAction, rightAction, className = "" }) {
  return (
    <div className={`sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {leftAction && <button onClick={leftAction.onClick} className="p-2 -ml-2">{leftAction.icon}</button>}
          <div>
            <h1 className="font-semibold text-gray-900 dark:text-white truncate">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>}
          </div>
        </div>
        {rightAction && <button onClick={rightAction.onClick} className="p-2 -mr-2">{rightAction.icon}</button>}
      </div>
    </div>
  );
}

/**
 * PullToRefresh wrapper for mobile
 */
export function PullToRefresh({ children, onRefresh, pulling = false }) {
  return (
    <div className="relative">
      <div
        className={`transition-all duration-300 ${
          pulling ? "opacity-100 translate-y-16" : "opacity-0 translate-y-0"
        }`}
      >
        <div className="flex justify-center items-center h-12">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
      <div onTouchMove={(e) => {
        if (window.scrollY === 0 && e.touches[0].clientY > 50) {
          // Trigger refresh logic here
        }
      }}>
        {children}
      </div>
    </div>
  );
}

/**
 * SwipeableCard - A card with swipe actions (for mobile)
 */
export function SwipeableCard({ children, leftAction, rightAction }) {
  const [offset, setOffset] = React.useState(0);
  const [startX, setStartX] = React.useState(0);

  const handleTouchStart = (e) => {
    setStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    if (leftAction && diff < 0) {
      setOffset(Math.max(diff, -100));
    } else if (rightAction && diff > 0) {
      setOffset(Math.min(diff, 100));
    }
  };

  const handleTouchEnd = () => {
    if (Math.abs(offset) > 60) {
      if (offset < 0 && leftAction) leftAction.onClick();
      if (offset > 0 && rightAction) rightAction.onClick();
    }
    setOffset(0);
  };

  return (
    <div
      className="relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {leftAction && (
        <div
          className="absolute inset-y-0 left-0 flex items-center justify-center w-24 bg-red-500 text-white"
          style={{ transform: `translateX(${offset + 100}px)` }}
        >
          {leftAction.label}
        </div>
      )}
      {rightAction && (
        <div
          className="absolute inset-y-0 right-0 flex items-center justify-center w-24 bg-green-500 text-white"
          style={{ transform: `translateX(${-100 + offset}px)` }}
        >
          {rightAction.label}
        </div>
      )}
      <div
        className="relative bg-white dark:bg-gray-800 transition-transform"
        style={{ transform: `translateX(${offset}px)` }}
      >
        {children}
      </div>
    </div>
  );
}