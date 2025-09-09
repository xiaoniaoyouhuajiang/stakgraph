export function PROMPT(user_query: string) {
  return `
You are a technical requirements analyst. Given a user request, your task is to:

1. Break down the request into concrete implementation tasks
2. Generate specific, searchable questions that would help find relevant code, files, functions, and data models in a knowledge base

**User Request:** ${user_query}

Please provide:

## A. Task Breakdown
Decompose the request into 2-7 specific implementation tasks, ordered by dependency/priority.

## B. Search Questions
Generate 3-10 targeted questions that would help find relevant information in a code knowledge base. Focus on:

**Technical Implementation:**
- How to implement [specific feature]?
- What components/libraries are used for [functionality]?
- How to handle [specific user action/workflow]?

**Data & Models:**
- What data models are needed for [entity]?
- How is [data type] stored and retrieved?
- What database schema supports [functionality]?

**Authentication & Permissions:**
- How to implement [permission type] in [context]?
- What authentication patterns are used for [user type]?
- How to validate [specific permission]?

**UI/Frontend:**
- What UI components exist for [interface element]?
- How to build [specific page/form type]?
- What styling patterns are used for [UI element]?

**Integration & APIs:**
- What API endpoints handle [functionality]?
- How to integrate [feature] with existing systems?
- What services manage [specific operations]?

Format each question to be specific and likely to match against existing Q&A pairs about implementation details, code patterns, and technical decisions.

PLEASE OUTPUT IN JSON FORMAT:

**Example Output Format:**
{
  "tasks": [
    "Create workspace data model",
    "Implement member invitation system",
    ...
  ],
  "questions": [
    "1. How to create a workspace data model with member relationships?",
    "2. What authentication middleware is used for admin permissions?",
    "3. How to implement user invitation workflow with email notifications?",
    ...
  ]
}
`;
}
