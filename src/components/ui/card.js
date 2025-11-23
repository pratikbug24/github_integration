import React from "react";

export function Card({ className = "", children, ...props }) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-md border border-gray-200 p-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = "", children }) {
  return (
    <div className={`border-b pb-2 mb-3 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-800">{children}</h3>
    </div>
  );
}

export function CardContent({ className = "", children }) {
  return <div className={`text-gray-700 ${className}`}>{children}</div>;
}

export function CardFooter({ className = "", children }) {
  return (
    <div className={`border-t pt-3 mt-3 text-sm text-gray-600 ${className}`}>
      {children}
    </div>
  );
}
