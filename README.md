# TaskRythm 🎯

**AI-Powered Project Management & Task Tracking Platform**

A modern, full-stack project management application that combines powerful task organization with intelligent AI assistance. TaskRythm helps teams and individuals manage projects, collaborate seamlessly, and leverage AI to optimize workflows.

> **Empower Productivity, Simplify Task Management Seamlessly**

---

## 📊 Repository Status

![Last Commit](https://img.shields.io/github/last-commit/TaskRythm/taskRythm?logo=github&style=flat-square)
![Repo Size](https://img.shields.io/github/repo-size/TaskRythm/taskRythm?logo=github&style=flat-square)
![JavaScript](https://img.shields.io/badge/javascript-70.2%25-yellow)
![Languages](https://img.shields.io/badge/languages-3-blue)
![Node.js](https://img.shields.io/badge/node.js-18%2B-green)
![TypeScript](https://img.shields.io/badge/typescript-5-blue)
![License](https://img.shields.io/badge/license-UNLICENSED-red)

### Built with the tools and technologies:

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-336791?logo=postgresql)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2024-F7DF1E?logo=javascript)

---

## 🌟 Features

### Core Project Management
- **Kanban Board** - Visual task tracking with drag-and-drop interface
- **Task Management** - Create, update, assign, and track tasks with detailed metadata
- **Project Organization** - Organize work into projects with workspace-based collaboration
- **Subtasks** - Break down complex tasks into manageable subtasks
- **Real-time Updates** - Live synchronization across team members
- **Activity Logging** - Complete audit trail of all project changes

### AI-Powered Features ✨
TaskRythm includes four specialized AI assistants:

1. **The Architect** 🏗️
   - Generate comprehensive project plans from natural language prompts
   - Automatically break down projects into actionable tasks
   - Estimate task complexity and dependencies

2. **The Doctor** 🏥
   - Analyze project health and identify bottlenecks
   - Detect risks and blocked tasks
   - Provide recommendations for team velocity improvement

3. **The Scribe** 📝
   - Automatically generate release notes from completed tasks
   - Create professional documentation
   - Summarize sprint accomplishments

4. **The Brain** 🧠
   - Chat with AI assistant about your projects
   - Get intelligent task suggestions
   - Ask questions about project status and recommendations

### Team Collaboration
- **Role-Based Access Control** - OWNER, ADMIN, MEMBER, VIEWER roles
- **Workspace Management** - Separate workspaces for different teams or projects
- **Invite System** - 7-day expiring invite tokens for team members
- **Task Assignment** - Assign tasks to team members with visibility tracking
- **Member Management** - Manage workspace members and their permissions

---

## 📋 Table of Contents

- [Screenshots](#screenshots)
- [Getting Started](#getting-started)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Development](#development)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Authentication](#authentication)
- [Contributing](#contributing)
- [License](#license)

---

## � Screenshots

TaskRythm provides a modern, intuitive interface for project management. Here are the key features in action:

### Dashboard & Workspace Overview
![Dashboard Overview](screenshots/1-dashboard-overview.png)
*Manage workspaces and view project overview with real-time statistics*

### Kanban Board - Full Project View
![Kanban Board](screenshots/2-kanban-board-full.png)
*Visual task management with 4-column Kanban board (TODO, IN_PROGRESS, BLOCKED, DONE)*

### AI Features Section - 4 AI Cards
![AI Features Cards](screenshots/3-ai-features-cards.png)
*Access all 4 AI-powered features: The Architect, Doctor, Scribe, and Brain*

### AI Features Info Modal
![AI Features Guide](screenshots/4-ai-info-modal.png)
*Comprehensive guide explaining all AI features and how to use them*

### Project Health Analysis - The Doctor
![Project Health Modal](screenshots/5-project-health-modal.png)
*AI-powered analysis identifying bottlenecks, risks, and team velocity insights*

### Release Notes Generation - The Scribe
![Release Notes Modal](screenshots/6-release-notes-modal.png)
*Automatically generate professional release notes from completed tasks*

### Task Detail Modal
![Task Detail Modal](screenshots/7-task-detail-modal.png)
*Create and edit tasks with full metadata, assignees, and activity tracking*

### Workspace Members Management
![Workspace Members](screenshots/8-workspace-members.png)
*Manage team members with role-based access control (OWNER, ADMIN, MEMBER, VIEWER)*

### Workspace Settings Panel
![Workspace Settings](screenshots/9-workspace-settings.png)
*Configure workspace settings and manage team permissions*

### Landing Page & Authentication
![Landing Page](screenshots/10-landing-page.png)
*Professional landing page with feature highlights and Auth0 integration*

---

## �🚀 Getting Started

### Prerequisites

Ensure you have the following installed:
- **Node.js** 18+ and npm/yarn
- **PostgreSQL** 14+ (for database)
- **Auth0 Account** (for authentication)
- **Google Cloud Project** (for AI features - Gemini API)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/taskrythm.git
   cd taskrythm
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   cd ..
   ```

4. **Set up environment variables:**

   **Frontend** (`.env.local`):
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:4000
   NEXT_PUBLIC_AUTH0_DOMAIN=your-auth0-domain.auth0.com
   NEXT_PUBLIC_AUTH0_CLIENT_ID=your-auth0-client-id
   NEXT_PUBLIC_AUTH0_REDIRECT_URI=http://localhost:3000/api/auth/callback
   ```

   **Backend** (`backend/.env`):
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/taskrythm
   JWT_SECRET=your-jwt-secret
   AUTH0_DOMAIN=your-auth0-domain.auth0.com
   AUTH0_CLIENT_ID=your-auth0-client-id
   GOOGLE_AI_API_KEY=your-google-generative-ai-key
   NODE_ENV=development
   ```

5. **Initialize the database:**
   ```bash
   cd backend
   npx prisma migrate dev --name init_schema
   cd ..
   ```

---

## 💻 Development

### Run the Development Environment

**Terminal 1 - Frontend (port 3000):**
```bash
npm run dev
```

**Terminal 2 - Backend (port 4000):**
```bash
cd backend
npm run start:dev
```

### Available Scripts

**Frontend:**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

**Backend:**
```bash
npm run start          # Start NestJS server
npm run start:dev      # Start with watch mode
npm run build          # Build production bundle
npm run test           # Run unit tests
npm run test:e2e       # Run E2E tests
npm run lint           # Run ESLint
```

### Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:4000
- **API Documentation:** http://localhost:4000/api (Swagger)

---

## 📁 Project Structure

```
taskrythm/
├── src/                          # Frontend source
│   ├── app/                      # Next.js app directory
│   │   ├── page.tsx              # Landing page
│   │   ├── layout.tsx            # Root layout with Auth0 & Toast provider
│   │   ├── projects/             # Project pages
│   │   ├── auth/                 # Auth pages
│   │   └── pricing/              # Pricing page
│   ├── components/               # React components
│   │   ├── Dashboard.tsx         # Main dashboard with workspace management
│   │   ├── ProjectHealthModal.tsx # AI health analysis modal
│   │   ├── ReleaseNotesModal.tsx  # AI release notes generation
│   │   └── ...                   # 24+ components total
│   ├── api/                      # API client functions
│   ├── hooks/                    # Custom React hooks
│   ├── contexts/                 # React contexts (Toast, etc.)
│   ├── store/                    # Zustand state management
│   └── lib/                      # Utilities (RBAC, etc.)
│
├── backend/                      # NestJS backend
│   ├── src/
│   │   ├── main.ts               # Entry point
│   │   ├── app.module.ts         # Root module
│   │   ├── auth/                 # JWT & Auth0 integration
│   │   ├── workspaces/           # Workspace management & RBAC
│   │   ├── projects/             # Project CRUD
│   │   ├── tasks/                # Task management
│   │   ├── activity/             # Activity logging
│   │   ├── ai/                   # AI service (Gemini)
│   │   └── common/               # Shared filters & decorators
│   ├── prisma/
│   │   ├── schema.prisma         # Database schema
│   │   └── migrations/           # Database migrations
│   └── test/                     # E2E tests
│
├── docs/                         # Documentation
├── public/                       # Static assets
├── package.json                  # Frontend dependencies
└── tsconfig.json                 # TypeScript config
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** [Next.js 16](https://nextjs.org) - React 19 with App Router
- **Language:** [TypeScript](https://www.typescriptlang.org)
- **Authentication:** [Auth0](https://auth0.com) - Secure OAuth2/OIDC
- **State Management:** [Zustand](https://github.com/pmndrs/zustand)
- **Icons:** [Lucide React](https://lucide.dev)
- **Styling:** CSS-in-JS (inline styles with responsive design)
- **HTTP Client:** Fetch API with Auth0 integration
- **Testing:** Jest + React Testing Library
- **Linting:** ESLint 9

### Backend
- **Framework:** [NestJS 11](https://nestjs.com) - Node.js framework
- **Language:** TypeScript
- **Authentication:** [Passport.js](http://www.passportjs.org) with JWT strategy
- **Database:** [PostgreSQL](https://www.postgresql.org) 14+
- **ORM:** [Prisma](https://www.prisma.io)
- **AI Integration:** [Google Generative AI](https://ai.google.dev) (Gemini 2.5-Flash)
- **Validation:** [Class Validator](https://github.com/typestack/class-validator)
- **Testing:** Jest + Supertest
- **Linting:** ESLint 9 with Prettier

### Infrastructure
- **Database:** PostgreSQL with Prisma migrations
- **Environment:** Node.js 18+
- **Package Manager:** npm or yarn

---

## 🔐 Authentication

TaskRythm uses **Auth0** for secure authentication:

1. Users authenticate via Auth0 (Google, GitHub, Email/Password, etc.)
2. Frontend receives ID token + Access token
3. Backend validates JWT tokens via JWKS
4. Role-based access control enforced at workspace level
5. Activities logged for audit trail

### Auth Flow
```
User Login → Auth0 → ID Token + Access Token → Frontend Store
                              ↓
        Backend Validates JWT via JWKS → Grant/Deny Access
```

---

## 📊 Database Schema

Key Prisma models:

```prisma
User              # Auth0 users
Workspace         # Team/personal spaces with ownership
WorkspaceMember   # User roles in workspaces (OWNER, ADMIN, MEMBER, VIEWER)
Project           # Projects within workspaces
Task              # Tasks with status, priority, type
TaskAssignee      # Many-to-many task assignments
ActivityLog       # Event audit trail
WorkspaceInvite   # 7-day expiring invite tokens
```

**Task Status Flow:** TODO → IN_PROGRESS → BLOCKED → DONE

**Task Types:** TASK, BUG, FEATURE, IMPROVEMENT, SPIKE

**Task Priority:** LOW, MEDIUM, HIGH

---

## 🤖 AI Integration

### Google Generative AI (Gemini)
- Model: `gemini-2.5-flash`
- Used for all four AI features
- Structured output (JSON) for task generation
- Real-time analysis with streaming responses

### API Endpoints
```
POST /ai/generate-plan      # The Architect
POST /ai/analyze-project    # The Doctor
POST /ai/write-report       # The Scribe
POST /ai/refine-task        # Task refinement
```

---

## 📝 API Documentation

### Key Endpoints

**Workspaces:**
```
GET    /workspaces                    # List user's workspaces
POST   /workspaces                    # Create workspace
PATCH  /workspaces/:id                # Update workspace
DELETE /workspaces/:id                # Delete workspace
POST   /workspaces/:id/members        # Add member
POST   /workspaces/:id/invites        # Create invite
POST   /invites/:token/accept         # Accept invite
```

**Projects:**
```
GET    /projects?workspaceId=:id      # List projects
POST   /projects                      # Create project
GET    /projects/:id                  # Get project details
PATCH  /projects/:id                  # Update project
DELETE /projects/:id                  # Delete project
```

**Tasks:**
```
GET    /tasks/project/:projectId      # List project tasks
POST   /tasks                         # Create task
GET    /tasks/:id                     # Get task details
PATCH  /tasks/:id                     # Update task
DELETE /tasks/:id                     # Delete task
POST   /tasks/:id/assign              # Assign task
```

**AI Features:**
```
POST   /ai/generate-plan              # Generate project plan
POST   /ai/analyze-project            # Analyze project health
POST   /ai/write-report               # Generate release notes
POST   /ai/refine-task                # Refine task description
```

---

## 🧪 Testing

### Run Tests

**Frontend:**
```bash
npm test                 # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

**Backend:**
```bash
cd backend
npm test                 # Unit tests
npm run test:e2e        # E2E tests
npm run test:cov        # Coverage report
```

### Test Coverage
- Services, controllers, and hooks covered
- E2E tests for critical workflows
- Auth and RBAC verification

---

## 🚀 Deployment

### Frontend (Vercel)
```bash
npm run build
# Deploy to Vercel via Git integration
```

### Backend (Any Node.js Host)
```bash
cd backend
npm run build
npm run start:prod
```

### Database
Use PostgreSQL hosting (AWS RDS, Heroku Postgres, Supabase, etc.)

---

## 📚 Environment Variables Reference

See `auth0-config.ts` for frontend Auth0 configuration and `.env.example` in backend.

---

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -am 'Add new feature'`
3. Push to branch: `git push origin feature/your-feature`
4. Submit a pull request

---

## 📄 License

This project is licensed under the UNLICENSED license.

---

## 📞 Support

For issues, questions, or feature requests, please open an issue on GitHub or contact the development team.

---

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org) and [NestJS](https://nestjs.com)
- AI powered by [Google Generative AI](https://ai.google.dev)
- Authentication by [Auth0](https://auth0.com)
- Database with [Prisma](https://www.prisma.io)

---

**Happy Task Management! 🎯**
