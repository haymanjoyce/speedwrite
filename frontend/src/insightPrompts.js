export const DOCUMENT_INSIGHT_ACTIONS = [
  {
    label: 'Summarise',
    action: 'summarise',
    prompt: 'Summarise the document\'s key points in 3–4 sentences.',
  },
  {
    label: 'Find contradictions',
    action: 'find_contradictions',
    prompt: 'Identify contradictions or inconsistencies within the document.',
  },
  {
    label: 'Extract themes',
    action: 'extract_themes',
    prompt: 'Extract the main themes and topics from the document.',
  },
]

export const SHARED_INSIGHT_ACTIONS = [
  {
    label: 'Summarise',
    action: 'summarise',
    prompt: 'Summarise the key points from the attached evidence source. What are the main findings, arguments, or facts?',
  },
  {
    label: 'Find contradictions',
    action: 'find_contradictions',
    prompt: 'Identify any contradictions, inconsistencies, or conflicting information in the attached evidence source.',
  },
  {
    label: 'Extract themes',
    action: 'extract_themes',
    prompt: 'Extract the common themes, topics, and patterns from the attached evidence source.',
  },
]
