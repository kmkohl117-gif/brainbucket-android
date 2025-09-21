import React from 'react';

const DebugInfo = () => {
  // Hard-coded values to match what should be in your storage-adapter.ts
  const API_BASE = 'https://brain-bucket-kmkohl117.replit.app';
  
  // Check environment variables
  const viteApiBase = process.env.VITE_API_BASE || import.meta?.env?.VITE_API_BASE || '(not set)';
  const isProd = process.env.NODE_ENV === 'production' || import.meta?.env?.PROD;
  const isDev = process.env.NODE_ENV === 'development' || import.meta?.env?.DEV;
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      background: 'red',
      color: 'white',
      padding: '10px',
      fontSize: '12px',
      zIndex: 9999,
      fontFamily: 'monospace'
    }}>
      <div>Hard-coded API_BASE: "{API_BASE}"</div>
      <div>VITE_API_BASE env: "{viteApiBase}"</div>
      <div>NODE_ENV: {process.env.NODE_ENV || 'unknown'}</div>
      <div>Is PROD: {isProd ? 'YES' : 'NO'}</div>
      <div>Is DEV: {isDev ? 'YES' : 'NO'}</div>
    </div>
  );
};

export default DebugInfo;