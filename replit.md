# AI Real Estate Lead Inbox

## Overview

This is a web application designed for Australian real estate agents to manage and analyze inbound buyer inquiries from multiple messaging platforms (LINE, WhatsApp, Messenger, Instagram, Email). The system uses OpenAI's GPT-4 to automatically analyze buyer messages, extract buyer profiles, score leads (hot/warm/cold), and generate personalized response suggestions in Traditional Chinese.

The application is built as a full-stack MVP with a React frontend and Express backend, designed to run on Replit with future plans for webhook/API integrations with messaging platforms.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18 with TypeScript, using Vite as the build tool and development server.

**UI Component Library**: shadcn/ui components built on top of Radix UI primitives, providing accessible and customizable UI elements. The design follows Fluent Design principles with Modern SaaS patterns inspired by Linear/Notion for a professional productivity tool aesthetic.

**Styling**: Tailwind CSS with a custom design system featuring:
- Traditional Chinese font optimization using 'Noto Sans TC'
- Monospace font 'Fira Code' for message display areas
- Custom color scheme with HSL-based theming supporting light/dark modes
- Responsive design with mobile-first approach (minimum 44px tap targets)

**State Management**: 
- TanStack Query (React Query) for server state management, data fetching, and caching
- React hooks for local component state
- Form handling via React Hook Form with Zod validation

**Routing**: Wouter for lightweight client-side routing

**Key Design Decisions**:
- Single-page application with chat interface as the primary view
- Three-panel layout: conversation list (left), chat messages (center), AI analysis panel (right)
- Collapsible panels for mobile responsiveness
- Real-time message updates with optimistic UI updates

### Backend Architecture

**Runtime**: Node.js with Express.js framework

**Language**: TypeScript with ES modules

**API Design**: RESTful API with the following endpoints:
- `GET /api/conversations` - Retrieve all conversations
- `GET /api/conversations/:id/messages` - Get messages for a specific conversation
- `POST /api/conversations/:id/messages` - Create new message in conversation
- `POST /api/conversations/:id/analyze` - Trigger AI analysis of conversation

**Development vs Production**:
- Development mode uses Vite middleware for hot module replacement
- Production mode serves pre-built static assets from the dist directory
- Environment-specific entry points (index-dev.ts and index-prod.ts)

**Data Validation**: Zod schemas shared between frontend and backend for type-safe API contracts

**Key Design Decisions**:
- Separation of concerns with dedicated modules for routes, storage, and AI integration
- In-memory storage implementation (MemStorage) for MVP with interface abstraction (IStorage) to enable future database integration
- Mock data initialization for development and testing
- Centralized error handling and request logging

### Data Storage Solutions

**Current Implementation**: In-memory storage using JavaScript Maps, suitable for MVP development and testing.

**Database Configuration**: Drizzle ORM configured with PostgreSQL support via Neon Database:
- Schema definitions in `shared/schema.ts`
- Migration support configured in `drizzle.config.ts`
- Connection via `@neondatabase/serverless` package
- Database URL expected in environment variable `DATABASE_URL`

**Schema Design**:
- Conversations table: buyer information, platform, lead scoring
- Messages table: conversation history with role-based messages (buyer/agent/system)
- Type-safe schema definitions using Zod with automatic TypeScript type inference

**Future Migration Path**: The IStorage interface abstraction allows seamless transition from in-memory storage to PostgreSQL without changing application logic.

### External Dependencies

**AI Service Integration**:
- **OpenAI API** (GPT-4/GPT-4.1-mini): Core AI analysis engine
  - Structured output using Zod response format
  - Custom system prompt specialized for Australian real estate market
  - Analysis includes: lead scoring, buyer profile extraction, response generation in Chinese/English
  - API key required via `OPENAI_API_KEY` environment variable

**Database Service**:
- **Neon Database**: Serverless PostgreSQL hosting
  - Configured but not yet actively used (current MVP uses in-memory storage)
  - Connection via `@neondatabase/serverless` package
  - Future migration path established

**Session Management**:
- **connect-pg-simple**: PostgreSQL session store (configured for future use)
- Session configuration prepared for production authentication flow

**Third-Party UI Libraries**:
- **Radix UI**: Accessible component primitives (accordion, dialog, dropdown, etc.)
- **Lucide React**: Icon library for consistent iconography
- **date-fns**: Date formatting and manipulation
- **Embla Carousel**: Carousel/slider functionality

**Development Tools**:
- **Replit-specific plugins**: Vite plugins for Replit integration (cartographer, dev-banner, runtime-error-modal)
- **Vite**: Build tool and development server
- **esbuild**: Production server bundling

**Design System Dependencies**:
- **Tailwind CSS**: Utility-first CSS framework
- **class-variance-authority**: Type-safe variant handling for components
- **tailwind-merge**: Intelligent Tailwind class merging utility

**Key Architectural Decisions**:
- OpenAI integration uses structured output format for reliable JSON parsing
- Market-specific prompts tailored for Australian real estate (Sydney suburbs, pricing, buyer journey)
- Separation of AI logic into dedicated module (`server/openai.ts`) for maintainability
- Environment-based configuration for API keys and database connections
- Shared schema definitions between client and server prevent type mismatches