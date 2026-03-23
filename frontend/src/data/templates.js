export const BUILT_IN_TEMPLATES = [
  {
    id: 'meeting-notes',
    title: 'Meeting Notes',
    description: 'Structured notes for meetings with agenda and action items',
    content: `# Meeting Notes

## Date
[Date]

## Attendees
- [Name]

## Agenda
1. [Item]

## Discussion
[Notes]

## Action Items
- [ ] [Action] — [Owner] — [Due date]
`,
  },
  {
    id: 'research-report',
    title: 'Research Report',
    description: 'Academic or professional research with structured sections',
    content: `# Research Report

## Abstract
[Brief summary of the report]

## Background
[Context and motivation]

## Methodology
[How the research was conducted]

## Findings
[Key results and data]

## Conclusions
[Interpretation and implications]

## References
- [Reference]
`,
  },
  {
    id: 'project-brief',
    title: 'Project Brief',
    description: 'Project overview with objectives, scope and timeline',
    content: `# Project Brief

## Overview
[Project description]

## Objectives
1. [Objective]

## Scope
### In Scope
- [Item]

### Out of Scope
- [Item]

## Timeline
| Milestone | Date |
|-----------|------|
| [Milestone] | [Date] |

## Stakeholders
- [Name] — [Role]
`,
  },
  {
    id: 'weekly-update',
    title: 'Weekly Update',
    description: 'Weekly progress report with highlights and next steps',
    content: `# Weekly Update

## Week of
[Date]

## Highlights
- [Achievement]

## Progress
[What was completed this week]

## Blockers
- [Blocker]

## Next Week
- [Planned task]
`,
  },
  {
    id: 'decision-log',
    title: 'Decision Log',
    description: 'Record of a decision with context and rationale',
    content: `# Decision Log

## Decision
[What was decided]

## Date
[Date]

## Context
[Why this decision was needed]

## Options Considered
1. [Option] — [Pros/Cons]
2. [Option] — [Pros/Cons]

## Rationale
[Why this option was chosen]

## Outcome
[Result or next steps]
`,
  },
]
