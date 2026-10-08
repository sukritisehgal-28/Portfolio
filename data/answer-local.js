// Offline answerer for "Ask my agents".
// Runs in the browser when the live agents API isn't reachable (and in the API's mock mode),
// answering from the same facts the live agents use.

import { PROFILE, JOURNEY, PROJECTS, RECOGNITION, SKILLS, CAREERS } from './profile.js';

export const AGENTS = [
  { id: 'experience', name: 'Experience agent' },
  { id: 'projects', name: 'Projects agent' },
  { id: 'recognition', name: 'Recognition agent' },
  { id: 'education', name: 'Education & skills agent' },
  { id: 'careers', name: 'Careers agent' },
];

const KEYWORDS = {
  experience: ['work', 'worked', 'job', 'intern', 'experience', 'company', 'companies', 'founder', 'founded', 'startup', 'done', 'career', 'history', 'teach', 'assistant', 'oriva', 'goodiebag', 'drdo', 'omdena', 'c5', 'niti', 'research'],
  projects: ['project', 'projects', 'built', 'build', 'made', 'make', 'demo', 'github', 'uzima', 'atlas', 'omnishelf', 'interviewar', 'secure medical', 'yoodle', 'app', 'code', 'portfolio', 'strongest', 'best'],
  recognition: ['award', 'awards', 'won', 'win', 'winner', 'hackathon', 'recogn', 'prize', 'fellow', 'nsf', 'catalyze', 'calhacks', 'finalist', 'semifinalist', 'judge', 'honor', 'achievement', 'certif', 'publication', 'published', 'paper', 'ieee', 'tie women', 'venture summit'],
  education: ['study', 'studied', 'degree', 'school', 'university', 'education', 'gpa', 'course', 'masters', 'ms ', 'b.tech', 'btech', 'graduat', 'skill', 'skills', 'stack', 'tools', 'language', 'python', 'sql', 'tensorflow', 'pytorch', 'tech'],
  careers: ['hire', 'hiring', 'open', 'available', 'availability', 'role', 'roles', 'looking', 'contact', 'email', 'reach', 'relocat', 'location', 'based', 'resume', 'cv', 'linkedin'],
};

const NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

// Years used only for "past N years" filtering of undated items.
const APPROX_YEAR = { 'cu-innovation-day': 2026, 'niti-aayog': 2022 };

const yearOf = (item) => (item.start ? Number(item.start.slice(0, 4)) : APPROX_YEAR[item.id] ?? null);

const yearsWindow = (q) => {
  const m = q.match(/(?:past|last)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+years?/);
  if (!m) return null;
  return Number(m[1]) || NUMBER_WORDS[m[1]] || null;
};

// Agents whose keywords appear in the question (empty when nothing matches).
export function pickAgents(question) {
  const q = ` ${question.toLowerCase()} `;
  const picked = AGENTS.filter((a) => KEYWORDS[a.id].some((k) => q.includes(k))).map((a) => a.id);
  if (yearsWindow(q) && !picked.includes('experience')) picked.unshift('experience');
  return picked;
}

// Answers stay short; the page links to the full sections underneath for more.
const MAX_ITEMS = 4;
const shortOrg = (org) => org.split(',')[0].replace(/\s*\(.*?\)/g, '').trim();
const line = (item) => `**${item.title}**, ${shortOrg(item.org)}${item.start ? ` (${item.when})` : ''}`;
const list = (items, render, max = MAX_ITEMS) =>
  [...items.slice(0, max).map((x) => `- ${render(x)}`), ...(items.length > max ? [`- and ${items.length - max} more below`] : [])].join('\n');

// Names a visitor might use for a specific role, event or project.
const JOURNEY_ALIASES = {
  oriva: 'oriva-health', goodiebag: 'goodiebag', 'goodie bag': 'goodiebag', ' c5': 'c5-consultare', consultare: 'c5-consultare',
  drdo: 'drdo', omdena: 'omdena', niti: 'niti-aayog', calhacks: 'calhacks', 'cal hacks': 'calhacks',
  'innovation day': 'cu-innovation-day', 'course assistant': 'course-assistant', teaching: 'course-assistant',
  msit: 'btech', 'b.tech': 'btech', btech: 'btech', bachelor: 'btech', 'healthcare ai hackathon': 'healthcare-ai-hackathon',
  'aws builder': 'healthcare-ai-hackathon', ieee: 'ieee-access', publication: 'ieee-access', 'published': 'ieee-access',
};
const PROJECT_ALIASES = {
  uzima: 'Project Uzima', atlas: 'ATLAS-MD', omnishelf: 'OmniShelf AI', interviewar: 'InterViewAR', 'secure medical': 'Secure Medical AI', yoodle: 'Yoodle',
  strongest: 'Project Uzima', 'best project': 'Project Uzima', favorite: 'Project Uzima', favourite: 'Project Uzima',
};

const findAlias = (q, table) => Object.entries(table).find(([alias]) => q.includes(alias))?.[1];

// The one role, event or project a question is about, if any (used to link straight to it).
export function findNamed(question) {
  const q = ` ${question.toLowerCase()} `;
  const projectName = findAlias(q, PROJECT_ALIASES);
  const project = projectName && PROJECTS.find((p) => p.name === projectName);
  if (project) return { type: 'project', name: project.name };
  const journeyId = findAlias(q, JOURNEY_ALIASES);
  const item = journeyId && JOURNEY.find((i) => i.id === journeyId);
  return item ? { type: 'journey', id: item.id } : null;
}

export function answerLocally(question, now = new Date()) {
  const q = ` ${question.toLowerCase()} `;
  let agentIds = pickAgents(question);
  const notes = {};

  // A question about one specific project or role gets that item's details.
  const hit = findNamed(question);
  const named = hit && (hit.type === 'project' ? PROJECTS.find((p) => p.name === hit.name) : JOURNEY.find((i) => i.id === hit.id));
  if (named) agentIds = [named.title ? 'experience' : 'projects'];

  const wantsSkills = /\b(stack|skills?|tools|technolog\w*|languages?)\b/.test(q);
  const wantsEducation = /(universit|degree|stud(y|ied)|school|gpa|graduat|master|college|education|coursework)/.test(q);
  const aboutHer = /\b(she|her|hers|sukriti|you|your)\b/.test(q);

  let text;
  const years = yearsWindow(q);

  if (!agentIds.length && !named && !aboutHer) {
    text = `I can only answer questions about Sukriti's work. Try "What has she built?" or email ${PROFILE.email}.`;
  } else if (wantsSkills && !named && !years && agentIds.every((id) => id === 'education')) {
    agentIds = ['education'];
    notes.education = `${Object.values(SKILLS).flat().length} skills`;
    text = `Her core stack:\n${Object.entries(SKILLS).map(([k, v]) => `- **${k}**: ${v.slice(0, 4).map((x) => x.replace(/\s*\(.*?\)/, '')).join(', ')}`).join('\n')}`;
  } else if (wantsEducation && !named && !years && agentIds.every((id) => id === 'education')) {
    agentIds = ['education'];
    const edu = JOURNEY.filter((i) => i.kind === 'edu');
    notes.education = `${edu.length} degrees`;
    text = list(edu, (i) => `${line(i)}. ${i.summary}`);
  } else if (years) {
    const from = now.getFullYear() - years;
    const items = JOURNEY.filter((item) => (yearOf(item) ?? 0) >= from);
    notes.experience = `${items.length} milestones since ${from}`;
    text = `Highlights since ${from}, newest first:\n${list(items, line)}`;
  } else if (named && named.title) {
    notes.experience = '1 match';
    text = `${line(named)}. ${named.summary}`;
  } else if (named) {
    notes.projects = '1 match';
    text = `**${named.name}**: ${named.short}\n- Result: ${named.result}\n- Built with ${named.stack.slice(0, 3).join(', ')}`;
  } else {
    if (!agentIds.length) agentIds = AGENTS.map((a) => a.id);
    const parts = [];
    // Several topics in one question: one line per topic.
    const compact = agentIds.length > 1;
    const names = (items, max = 3) => `${items.slice(0, max).map((x) => `**${x}**`).join(', ')}${items.length > max ? ` and ${items.length - max} more` : ''}`;
    if (agentIds.includes('projects')) {
      notes.projects = `${PROJECTS.length} main projects`;
      parts.push(compact
        ? `- Projects: ${names(PROJECTS.map((p) => p.name))}.`
        : `Her main projects:\n${list(PROJECTS, (p) => `**${p.name}**: ${p.short}`, 3)}`);
    }
    if (agentIds.includes('recognition')) {
      notes.recognition = `${RECOGNITION.length} results`;
      parts.push(compact
        ? `- Recognition: ${RECOGNITION.slice(0, 2).map((r) => r.title.replace(/\s*\(.*?\)$/, '')).join('; ')}; and ${RECOGNITION.length - 2} more.`
        : `Recognition:\n${list(RECOGNITION, (r) => `${r.title}${r.when ? ` (${r.when})` : ''}`, 3)}`);
    }
    if (agentIds.includes('experience')) {
      const roles = JOURNEY.filter((i) => i.kind === 'exp' || i.kind === 'founder');
      notes.experience = `${roles.length} roles`;
      parts.push(compact
        ? `- Experience: ${names(roles.map((i) => `${i.title}, ${shortOrg(i.org)}`), 2)}.`
        : `Experience:\n${list(roles, line)}`);
    }
    if (agentIds.includes('education')) {
      notes.education = 'MS + B.Tech';
      const edu = JOURNEY.filter((i) => i.kind === 'edu');
      parts.push(compact ? `- Education: ${edu.map((i) => `**${i.title}**, ${shortOrg(i.org)}`).join('; ')}.` : list(edu, line));
    }
    if (agentIds.includes('careers')) {
      notes.careers = 'open to roles';
      const roles = CAREERS.openTo.map((r, i) => (i ? r.replace(/^Data/, 'data').replace(/^Applied/, 'applied') : r));
      const open = `${roles.slice(0, -1).join(', ')} and ${roles.at(-1)} roles`;
      parts.push(compact
        ? `- Open to ${open}, in any location.`
        : `${/\b(open|hir\w*|available|looking)\b/.test(q) ? 'Yes. ' : ''}She's open to ${open}, in any location. Email ${PROFILE.email}.`);
    }
    // A broad question ("who is she?") gets her short summary; the sections below have the rest.
    text = agentIds.length === AGENTS.length ? PROFILE.summary : parts.join(compact ? '\n' : '\n\n');
  }

  return {
    agents: AGENTS.map((a) => ({ id: a.id, used: agentIds.includes(a.id), note: notes[a.id] || (agentIds.includes(a.id) ? 'checked' : 'not needed') })),
    text,
  };
}
