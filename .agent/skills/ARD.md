# Skill: Record Architecture Decision (ADR)

## Purpose
Use this skill whenever you make a significant architectural or design choice (e.g., choosing a database, choosing a specific library, or defining a component structure).

## Instructions
1. Create a new file in `.agent/docs/adr/` with the format `YYYY-MM-DD-short-title.md`.
2. Follow this template:
   - **Title**: Simple name of the decision.
   - **Status**: Proposed / Accepted / Superseded.
   - **Context**: What is the problem we are solving?
   - **Decision**: What is the chosen solution?
   - **Consequences**: What are the trade-offs (pros/cons)?
3. Link the decision to the relevant code files in the metadata.

## Trigger
- Before starting a major refactor.
- When the user asks "Why did we do it this way?".