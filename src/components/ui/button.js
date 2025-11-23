import React from "react";

export function Button({
  children,
  onClick,
  className = "",
  variant = "primary",
  ...props
}) {
  const baseStyle =
    "px-4 py-2 rounded-lg font-medium focus:outline-none transition-all duration-200";

  const variants = {
    primary:
      "bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-md",
    secondary:
      "bg-gray-100 text-gray-800 hover:bg-gray-200 active:scale-95 border border-gray-300",
    danger:
      "bg-red-600 text-white hover:bg-red-700 active:scale-95 shadow-md",
  };

  return (
    <button
      onClick={onClick}
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
