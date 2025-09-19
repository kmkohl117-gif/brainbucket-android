#!/usr/bin/env node

// Workaround script to run proper build commands
// This handles the CORS dependency issue by bundling instead of using --packages=external

import { execSync } from 'child_process';

console.log('Starting production build with dependency bundling...');

try {
  // Build frontend
  console.log('Building frontend...');
  execSync('vite build', { stdio: 'inherit' });
  
  // Build backend with selective bundling (bundle some deps, external others)
  console.log('Building backend (selective dependency bundling)...');
  execSync('esbuild server/index.ts --platform=node --bundle --format=esm --outdir=dist --external:lightningcss --external:@babel/preset-typescript --external:bufferutil --external:utf-8-validate', { stdio: 'inherit' });
  
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}