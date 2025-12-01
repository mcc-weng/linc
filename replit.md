# AI Real Estate Lead Inbox

## Overview

This is a web application designed for Australian real estate agents to manage and analyze inbound buyer inquiries from multiple messaging platforms (Facebook Messenger integrated, with future plans for LINE, WhatsApp, Instagram, Email). The system uses OpenAI's GPT-4 to automatically analyze buyer messages, extract buyer profiles, score leads (hot/warm/cold), and generate personalized response suggestions in Traditional Chinese.

The application is built as a full-stack MVP with a React frontend and Express backend, designed to run on Replit with Facebook Messenger webhook integration.

## Recent Changes (December 2025)

### PRD v0.1 Features Implemented
- **Auto-Follow-Up Engine**: Tracks buyer inactivity and suggests follow-up messages when buyers haven't responded within 12 hours
- **FAQ Quick Reply Templates**: Keyword detection for common questions (price, inspection, property info, contracts) with one-click response templates
- **AI Conversation Summaries**: Generates structured summaries including buyer profile, questions asked, and pending actions
- **Action Dashboard**: New `/dashboard` page showing leads needing follow-up, hot leads, and unread messages with stats overview

### Multi-Listing Feature (Latest)
- **ListingChipsBar**: Displays linked listings as chips below chat header, allows adding/removing/setting primary listings
- **ListingSelectPopover**: Dialog for selecting a specific listing when multiple are linked to a conversation
- **Property-Aware Quick Replies**: Quick reply templates now show active listing context and allow listing selection for disambiguation
- **Junction Table Architecture**: `conversationListings` table manages many-to-many relationship between conversations and listings

### Schema Updates
- Added `listings` table for property information (used in quick reply templates)
- Added `conversationListings` junction table linking conversations to multiple listings with `isPrimary` flag
- Added follow-up tracking fields to conversations (lastBuyerMessageAt, lastAgentMessageAt, autoFollowUpEnabled, followUpSentCount)
- Added AI summary JSON storage field
- Added follow-up logs table for tracking all follow-up actions

### API Endpoints Added
- `GET/POST /api/conversations/:id/summary` - AI summary generation
- `GET/POST /api/conversations/:id/followup` - Follow-up status and suggestions
- `POST /api/conversations/:id/followup/toggle` - Enable/disable auto-follow-up
- `GET /api/quick-replies` - Get quick reply templates
- `POST /api/quick-replies/generate` - Generate quick reply message
- `GET/POST/PATCH/DELETE /api/listings` - Listing CRUD operations
- `GET /api/dashboard` - Dashboard data with categorized leads
- `GET /api/conversations/:id/listings` - Get linked listings for a conversation
- `POST /api/conversations/:id/listings` - Link a listing to conversation
- `DELETE /api/conversations/:id/listings/:listingId` - Unlink a listing
- `PUT /api/conversations/:id/listings/:listingId/primary` - Set listing as primary

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18 with TypeScript, using Vite as the build tool and development server.

**Pages**:
- `/` - Chat page with three-panel layout (conversations, messages, AI analysis)
- `/dashboard` - Action dashboard with lead prioritization tabs

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
- Real-time message updates with 5-second polling interval
- Dashboard for quick access to leads needing attention

### Backend Architecture

**Runtime**: Node.js with Express.js framework

**Language**: TypeScript with ES modules

**API Design**: RESTful API with the following core endpoints:
- `GET /api/conversations` - Retrieve all conversations
- `GET /api/conversations/:id/messages` - Get messages for a specific conversation
- `POST /api/conversations/:id/messages` - Create new message in conversation
- `POST /api/conversations/:id/analyze` - Trigger AI analysis of conversation
- `GET /api/dashboard` - Get dashboard data with categorized leads and stats
- `GET/POST /api/conversations/:id/summary` - AI summary operations
- `GET/POST /api/conversations/:id/followup` - Follow-up status and suggestions

**Facebook Integration**:
- Webhook endpoint at `/webhook` for receiving Messenger messages
- Signature verification using HMAC-SHA256
- Echo message detection to distinguish agent-sent messages
- `POST /api/facebook/sync` - Sync conversations from Facebook
- `GET /api/facebook/status` - Check integration status

**Development vs Production**:
- Development mode uses Vite middleware for hot module replacement
- Production mode serves pre-built static assets from the dist directory
- Environment-specific entry points (index-dev.ts and index-prod.ts)

**Data Validation**: Zod schemas shared between frontend and backend for type-safe API contracts

**Key Design Decisions**:
- Separation of concerns with dedicated modules for routes, storage, AI integration, FAQ detection, and Facebook integration
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
- **listings** table: Property information for quick reply templates (address, price guide, inspection times, etc.)
- **conversations** table: Buyer information, platform, lead scoring, follow-up tracking, AI summary storage
- **messages** table: Conversation history with role-based messages (buyer/agent/system)
- **follow_up_logs** table: Tracks all follow-up actions (suggested, auto_sent, manual_sent, dismissed)
- Type-safe schema definitions using Zod with automatic TypeScript type inference

**Future Migration Path**: The IStorage interface abstraction allows seamless transition from in-memory storage to PostgreSQL without changing application logic.

### External Dependencies

**AI Service Integration**:
- **OpenAI API** (GPT-4o): Core AI analysis engine
  - Structured output using Zod response format
  - Custom system prompt specialized for Australian real estate market
  - Analysis includes: lead scoring, buyer profile extraction, response generation in Chinese/English
  - AI Summary generation with buyer profile, questions asked, pending actions
  - Follow-up suggestion generation based on conversation context
  - API key required via `OPENAI_API_KEY` environment variable

**Facebook Messenger Integration**:
- Page Access Token via `FACEBOOK_PAGE_ACCESS_TOKEN`
- Verify Token via `FACEBOOK_VERIFY_TOKEN`
- App Secret via `FACEBOOK_APP_SECRET` (for webhook signature verification)

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
- FAQ detection module (`server/faq.ts`) for keyword matching and quick reply templates
- Facebook integration module (`server/facebook.ts`) for Messenger webhook handling
- Environment-based configuration for API keys and database connections
- Shared schema definitions between client and server prevent type mismatches
