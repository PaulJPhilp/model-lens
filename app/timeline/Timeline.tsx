
'use client';

import React from 'react';

export function Timeline({ model }: { model: string }) {
  return (
    <div className="p-8 text-center">
      <h2 className="text-2xl font-bold mb-4">Timeline for {model}</h2>
      <p className="text-gray-600 mb-4">Timeline visualization coming soon...</p>
      <div className="bg-gray-100 rounded-lg p-8 min-h-[400px] flex items-center justify-center">
        <div className="text-gray-500">
          <div className="text-4xl mb-2">📊</div>
          <p>Model release history and pricing changes will be visualized here</p>
        </div>
      </div>
    </div>
  );
}
