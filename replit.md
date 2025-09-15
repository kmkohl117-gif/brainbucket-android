# BrainBucket

## Overview

BrainBucket is a local-first ADHD-friendly personal productivity app designed for fast thought capture and later organization. The application follows a "capture-first, organize-later" philosophy with biometric authentication, quick capture functionality, and a bucket-based organization system. Built as a full-stack TypeScript application with React frontend and Express backend, it emphasizes offline-first functionality with clean, distraction-free UI design.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React SPA** with TypeScript using Vite as the build tool
- **State Management**: Zustand with persistence for client-side state
- **UI Framework**: Tailwind CSS with shadcn/ui components for consistent, accessible design
- **Routing**: Wouter for lightweight client-side routing
- **Data Fetching**: TanStack Query for server state management and caching
- **Local Storage**: IndexedDB integration for offline-first data persistence

### Backend Architecture  
- **Express.js** server with TypeScript providing RESTful API endpoints
- **In-Memory Storage**: Currently uses MemStorage class for development/prototyping
- **Database Ready**: Drizzle ORM configured for PostgreSQL with schema definitions
- **File Upload**: Multer middleware for handling file attachments
- **Session Management**: Express sessions with PostgreSQL session store (connect-pg-simple)

### Authentication & Security
- **Biometric Authentication**: WebAuthn/FIDO2 implementation for passwordless login
- **Local-First Security**: Biometric data stored locally, no server-side authentication dependencies
- **Session Persistence**: Zustand persistence for maintaining authentication state

### Data Architecture
- **Schema-First Design**: Shared TypeScript schema definitions between client and server
- **Hierarchical Organization**: Users → Buckets → Folders → Captures structure
- **Type Safety**: Zod validation schemas derived from Drizzle ORM definitions
- **Flexible Content Types**: Support for tasks, ideas, and reference captures with attachments

### Mobile-First Design
- **Responsive Layout**: Tailored for mobile-first experience with touch-friendly interactions
- **Progressive Enhancement**: Works offline with sync capabilities when online
- **Native-like Experience**: Bottom navigation, gesture-friendly UI patterns

## External Dependencies

### Database & Storage
- **Neon Database**: Serverless PostgreSQL for production data storage
- **Drizzle ORM**: Type-safe database toolkit with migrations support
- **IndexedDB**: Browser-based offline storage via 'idb' library

### UI & Styling
- **Radix UI**: Headless UI components for accessibility and consistency
- **Tailwind CSS**: Utility-first styling with custom design tokens
- **Lucide React**: Icon library for consistent visual language

### Development & Build Tools
- **Vite**: Frontend build tool with HMR and optimized bundling
- **ESBuild**: Backend bundling for production deployment
- **TypeScript**: End-to-end type safety across client, server, and shared code

### Authentication & Security
- **WebAuthn API**: Browser-native biometric authentication
- **Crypto API**: For secure credential generation and storage

The architecture prioritizes fast capture workflows, offline reliability, and extensible organization systems while maintaining clean separation between presentation, business logic, and data persistence layers.