const INTRO = `You are a codebase exploration assistant. Your goal is to help users understand code efficiently by gathering JUST ENOUGH context - no more, no less.

## Exploration Strategy:
1. **Start with the user's goal** - are they trying to understand a feature, fix a bug, or implement something new?
2. **Follow the "zoom pattern"**: Overview → Relevant files → Key functions → Dependencies (only if needed)
3. **Stop when you can answer the user's question** - don't explore "just because"
`;

export const EXPLORER = `
${INTRO}

## Tool Usage Guidelines:

**repo_overview**: Always start here unless user asks about specific file
**file_summary**: Use when you need to understand what a file does before diving deeper  
**feature_map**: Use ONLY when you need to see how pieces connect

## Stopping Criteria:
- ✅ Stop when you can explain the user's question
- ✅ Stop when you have a clear implementation plan
- ✅ Stop at natural boundaries (single file, single feature)
- ❌ Don't explore "related" code unless it's blocking your understanding
- ❌ Don't go more than 2-3 levels deep unless explicitly needed
`;

export const RE_EXPLORER = `
${INTRO}

If you see previous question/answer pairs in the conversation history, you can re-use some of the intelligence gathered! You can use the links/files/function/etc and write a more relevant answer to the user's new question, or you can use the tools provided to do further exploration of the codebase. Your choice.

## Tool Usage Guidelines:

**repo_overview**: You might want to use this first, if the question needs further exploration
**file_summary**: Use when you need to understand what a file does before diving deeper  
**feature_map**: Use ONLY when you need to see how pieces connect

## Stopping Criteria:
- ✅ You dont have to explore! You can also just use previous knowledge collected and give a more relevant answer to the user's question
- ✅ Stop when you can explain the user's question
- ✅ Stop when you have a clear implementation plan
- ❌ Don't explore "related" code unless it's blocking your understanding
- ❌ Don't go more than 2-3 levels deep unless explicitly needed
`;

export const FINAL_ANSWER_DESCRIPTION = `Provide the final answer to the user. ALWAYS include relevant files or function names in the answer (and a quick note about why this piece of code is relevant to the issue at hand). DO NOT include long lists of irrelevant files like migration files. This answer will be used by the next model to actually build the feature, so try to give clues for locating core functionality to the issue at hand. Try to be succinct and clear in your answer!!! Don't be super verbose, 1 or 2 examples is enough. YOU **MUST** CALL THIS TOOL AT THE END OF YOUR EXPLORATION.
`;

export const GENERAL_EXPLORER = `
You are a codebase exploration assistant. Use the provided tools to explore the codebase and answer the user's question. Focus on general language and framework first, then specific core libraries, integrations, and features. Try to understand the core functionallity (user stories) of the codebase. Explore files, functions, and component names to understand the main user stories, pages, UX components, or workflows in the application.
`;

export const GENERAL_FINAL_ANSWER_DESCRIPTION = `

Provide the final answer to the user. YOU **MUST** CALL THIS TOOL AT THE END OF YOUR EXPLORATION.

Return a simple JSON object with the following fields:

- "summary": a 1-4 sentence short synopsis of the codebase.
- "key_files": an array of the core package and LLM agent files. Focus on package files like package.json, and core markdown files. DO NOT include code files unless they are central to the codebase, such as the main DB schema file.
- "features": an array of 20 - 50 core user stories, one sentence each. Each one should be focused on ONE SINGLE user flow... DO NOT flesh these out for not reason!! Keep them short and to the point.

{
  "summary": "This is a next.js project with a postgres database and a github oauth implementation",
  "key_files": ["package.json", "README.md", "CLAUDE.md", "AGENTS.md"],
  "features": ["User login with github oauth.", "Tasks component with LLM chat implementation, for working on a code repository.", "User Journeys page with an interactive iframe browser."]
}
`;

/*

{
  "summary": "Hive is a comprehensive development workspace platform built with Next.js that enables teams to manage code repositories, run AI-powered tasks, and monitor development workflows. It integrates with GitHub, provides stakgraph code analysis, and features automated janitor processes for code quality maintenance.",
  "key_files": ["package.json", "prisma/schema.prisma", "CLAUDE.md", "docs/ARCHITECTURE.md", "src/app/w/[slug]/task/[...taskParams]/page.tsx", "src/lib/auth/nextauth.ts", "src/services/stakwork/index.ts", "src/services/janitor.ts"],
  "features": [
    "User authentication via GitHub OAuth",
    "Create and manage development workspaces with team collaboration",
    "Connect GitHub repositories to workspaces for code analysis",
    "Interactive task management with AI-powered chat interface for code assistance",
    "Real-time collaboration using Pusher for task updates and workflow status",
    "Code graph generation and analysis through stakgraph integration",
    "Automated janitor system for code quality checks and recommendations",
    "Swarm-based distributed computing for task execution",
    "Integration with Stakwork platform for project and customer management",
    "Pool manager integration for resource allocation and environment setup",
    "Onboarding wizard for workspace setup with step-by-step configuration",
    "Dashboard with repository connection and project overview",
    "Task artifacts management including code, forms, browser previews, and test results",
    "WebSocket connections for real-time project logs and status updates",
    "File upload system using AWS S3 with presigned URLs",
    "Insights and analytics dashboard with test coverage and recommendations",
    "Roadmap management with features, requirements, and user stories",
    "Workspace member management with role-based access control",
    "Settings management for workspace configuration and preferences",
    "API integrations for GitHub webhooks and repository management",
    "Docker containerization with development and production environments",
    "Comprehensive testing suite with unit, integration, and end-to-end tests",
    "Database encryption for sensitive data with field-level encryption",
    "Theme support with light and dark mode options",
    "Responsive UI built with Tailwind CSS and shadcn/ui components"
  ]
}
  

{
  "summary": "Hive is a sophisticated AI-powered development workspace platform built with Next.js 15 that allows teams to manage repositories, create and assign tasks, and leverage AI agents for code development through an integrated chat interface. The platform features GitHub OAuth authentication, workspace management, real-time collaboration, and external service integrations with encryption for sensitive data.",
  "key_files": [
    "package.json",
    "README.md", 
    "CLAUDE.md",
    "docs/ARCHITECTURE.md",
    "prisma/schema.prisma",
    "src/services/README.md",
    "src/lib/auth/nextauth.ts",
    "src/lib/encryption/index.ts"
  ],
  "features": [
    "User authentication via GitHub OAuth with encrypted token storage",
    "Workspace creation and management with role-based access control", 
    "Repository integration and GitHub webhook support",
    "AI-powered task creation and assignment system",
    "Interactive chat interface with LLM agents for code development",
    "Real-time collaboration using Pusher for live updates",
    "Artifact generation including code, forms, browser content and bug reports",
    "File upload and attachment system with S3 presigned URLs",
    "Workflow status tracking for automated task processing",
    "Code graph visualization and analysis",
    "Swarm infrastructure management with wizard-guided setup",
    "Pool Manager integration for resource provisioning",
    "Stakwork API integration for project management",
    "Field-level encryption for sensitive data like API keys and tokens",
    "Multi-step onboarding wizard for workspace setup",
    "Product and feature roadmap planning with user stories",
    "Requirements management with MoSCoW prioritization",
    "Comment system for collaborative discussions",
    "Janitor system for automated code quality recommendations",
    "Unit, integration and E2E test automation",
    "Bug report generation with iframe analysis",
    "Environment variable configuration management",
    "Comprehensive audit trails for all user actions",
    "Dashboard with workspace overview and activity tracking",
    "Task filtering and pagination with advanced search",
    "Member invitation and role management system",
    "Repository connection with branch selection",
    "Docker containerization for deployment",
    "PostgreSQL database with Prisma ORM",
    "TypeScript throughout with Zod validation",
    "Tailwind CSS with shadcn/ui components",
    "Responsive design with mobile support",
    "Error handling and toast notifications",
    "Debug overlay system for development",
    "Mock authentication support for development environments",
    "Integration test suite with database fixtures",
    "Key rotation support for encryption keys",
    "Webhook handling for external service callbacks",
    "Project log streaming via WebSocket connections",
    "Theme switching with dark/light mode support"
  ]
}

User authentication via GitHub OAuth with encrypted token storage

 ======== Q: How does the GitHub OAuth login flow redirect users and handle authorization codes?
 ======== Q: How are GitHub OAuth tokens encrypted and stored in the database?
 ======== Q: What happens when a user's GitHub OAuth token expires or becomes invalid?
 ======== Q: How does the authentication middleware verify GitHub OAuth tokens for protected routes?
 ======== Q: What user profile data is retrieved from GitHub during the OAuth process?
*/
