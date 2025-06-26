# GPT da Câmara Regional de Caruaru do TJPE

## Overview

This is a full-stack web application built for the Regional Chamber of Caruaru of the Pernambuco Court of Justice (Tribunal de Justiça de Pernambuco). The platform serves as a specialized GPT marketplace where legal professionals can discover, manage, and utilize AI-powered tools tailored for judicial work.

The application provides a Netflix-style interface for browsing legal GPTs, user management with role-based access control, and integration with OpenAI's GPT models for specialized legal assistance.

## System Architecture

### Full-Stack Architecture
- **Frontend**: React 18 with TypeScript, built using Vite
- **Backend**: Node.js with Express.js 
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS with shadcn/ui components
- **Authentication**: Passport.js with session-based auth
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter (lightweight React router)

### Technology Stack
- **Runtime**: Node.js 20
- **Package Manager**: npm
- **Build Tool**: Vite for frontend, esbuild for backend
- **Database Driver**: Neon serverless PostgreSQL
- **Session Store**: connect-pg-simple for PostgreSQL sessions
- **File Upload**: Multer for handling image uploads
- **AI Integration**: OpenAI API for GPT interactions

## Key Components

### Frontend Architecture
- **Component Library**: shadcn/ui with Radix UI primitives
- **Styling System**: Tailwind CSS with custom design tokens
- **Theme Support**: Dark/light mode with theme provider
- **Responsive Design**: Mobile-first approach with desktop sidebar
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **API Structure**: RESTful endpoints under `/api` prefix
- **Middleware Stack**: Express.js with JSON parsing, CORS, session management
- **Authentication**: Passport.js Local Strategy with password hashing
- **Database Layer**: Drizzle ORM with type-safe queries
- **File Handling**: Multer for avatar/image uploads

### Database Schema
- **Users**: Authentication and profile management with role-based access (admin, magistrate, user)
- **GPTs**: Core entity storing GPT information, categories, ratings, and URLs
- **Favorites**: Many-to-many relationship between users and GPTs
- **Usage Logs**: Tracking user interactions with GPTs
- **Categories**: Organized by legal specialization areas

## Data Flow

### Authentication Flow
1. User submits credentials via login form
2. Passport.js validates against database using scrypt hashing
3. Session established with PostgreSQL store
4. Frontend receives user object and updates auth context
5. Protected routes check authentication status

### GPT Discovery Flow
1. Frontend requests GPT data via TanStack Query
2. Backend queries database with filters (featured, new, popular, category)
3. Data returned with pagination and sorting
4. Frontend renders in Netflix-style grid layout
5. User interactions tracked via usage logs

### Favorites Management
1. User clicks favorite button on GPT card
2. Frontend sends POST/DELETE request to favorites endpoint
3. Backend updates many-to-many relationship table
4. Query cache invalidated to reflect changes
5. UI updates optimistically with loading states

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL client
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI primitives
- **drizzle-orm**: Type-safe ORM for PostgreSQL
- **passport**: Authentication middleware
- **openai**: OpenAI API client for GPT integration

### Development Tools
- **tsx**: TypeScript execution for development
- **drizzle-kit**: Database migrations and schema management
- **@types/***: TypeScript definitions
- **vite**: Build tool and dev server

### UI/UX Libraries
- **class-variance-authority**: Component variant management
- **clsx**: Conditional class names
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library
- **remixicon**: Additional icon set

## Deployment Strategy

### Development Environment
- **Local Development**: `npm run dev` starts both frontend and backend
- **Hot Reload**: Vite HMR for frontend, tsx watch mode for backend
- **Database**: Uses Neon serverless PostgreSQL with connection pooling
- **Port Configuration**: Frontend on 5000, proxied through Express

### Production Build
- **Frontend Build**: Vite builds optimized React bundle to `dist/public`
- **Backend Build**: esbuild compiles TypeScript server to `dist/index.js`
- **Static Serving**: Express serves built frontend assets
- **Environment Variables**: Database URL, session secrets, OpenAI API key

### Replit Configuration
- **Auto-deploy**: Configured for Replit autoscale deployment
- **Build Process**: `npm run build` compiles both frontend and backend
- **Runtime**: `npm run start` serves production application
- **Port Mapping**: Internal port 5000 mapped to external port 80

## Changelog
- June 25, 2025: Initial setup and migration to Replit
- June 25, 2025: Added new GPT creation fields (name, system instructions, model, temperature) to admin interface
- June 25, 2025: Added files field to GPT creation for reference documents
- June 25, 2025: Implemented internal chat system with OpenAI integration and agent switching capabilities
- June 25, 2025: Added home button to chat screen for easy navigation back to main page
- June 25, 2025: Implemented separate message histories for each agent to maintain context per GPT
- June 25, 2025: Completed database-backed persistent messaging system with PostgreSQL storage
- June 25, 2025: Messages now survive page reloads and only clear when "Limpar" button is clicked
- June 25, 2025: Enhanced user GPT creation capabilities - regular users now have full admin-level GPT creation features including system instructions, model selection, temperature settings, and file attachments
- June 26, 2025: Implemented OpenAI vector store API integration for file uploads in GPT creation forms
- June 26, 2025: Added drag-and-drop file upload interface replacing text-based file URL input
- June 26, 2025: Files now automatically upload to OpenAI vector stores for enhanced file search capabilities
- June 26, 2025: Both My GPTs and admin "Novo GPT" buttons now use identical comprehensive forms with file upload

## User Preferences

Preferred communication style: Simple, everyday language.