// "Ask my agents": five specialist agents read their slice of Sukriti's facts in parallel,
// then an orchestrator agent writes the answer and streams it back.
// Events are emitted as plain objects; api/ask.js turns them into an NDJSON stream.

import Anthropic from '@anthropic-ai/sdk';
import { PROFILE, JOURNEY, PROJECTS, RECOGNITION, SKILLS, CAREERS } from '../data/profile.js';
import { AGENTS, answerLocally } from '../data/answer-local.js';

// Claude Haiku 4.5: the fastest, lowest-cost Claude model, a good fit for short portfolio answers.
export const MODEL = 'claude-haiku-4-5';
const NO_INFO = 'NO_RELEVANT_INFO';

const fmtItem = (i) =>
  [
    `- ${i.title} | ${i.org} | ${i.location} | ${i.when}${i.start ? ` (started ${i.start})` : ''}`,
    `  ${i.summary}`,
    ...(i.roles?.length ? [`  Positions held here, newest first (${i.roles.map((r) => `${r.title}, ${r.when}`).join('; then before that, ')}):`] : []),
    ...(i.roles ?? []).flatMap((r) => [`  Position: ${r.title} | ${r.org} | ${r.location} | ${r.when}`, ...r.bullets.map((b) => `    • ${b}`)]),
    ...i.bullets.map((b) => `  • ${b}`),
    i.tags.length ? `  Skills: ${i.tags.join(', ')}` : '',
    ...i.links.map((l) => `  Link (${l.label}): ${l.url}`),
  ].filter(Boolean).join('\n');

const KNOWLEDGE = {
  experience: () =>
    `Work experience and founding history (newest first):\n${JOURNEY.filter((i) => i.kind === 'exp' || i.kind === 'founder').map(fmtItem).join('\n')}\n\nHackathons and events she took part in:\n${JOURNEY.filter((i) => i.kind === 'rec').map(fmtItem).join('\n')}`,
  projects: () =>
    `Main projects:\n${PROJECTS.map((p) => `- ${p.name} (${p.kicker}): ${p.description} Result: ${p.result}. Stack: ${p.stack.join(', ')}. ${p.links.map((l) => `${l.label}: ${l.url}`).join(' | ')}`).join('\n')}\nOther projects are listed on GitHub: ${PROFILE.links.github}\nOriva Health is her company (see experience), not a side project.`,
  recognition: () =>
    `Awards, selections and leadership:\n${RECOGNITION.map((r) => `- ${r.title}${r.when ? ` (${r.when})` : ''}`).join('\n')}\n\nDetails:\n${JOURNEY.filter((i) => i.kind === 'rec').map(fmtItem).join('\n')}`,
  education: () =>
    `Education:\n${JOURNEY.filter((i) => i.kind === 'edu').map(fmtItem).join('\n')}\n\nSkills:\n${Object.entries(SKILLS).map(([k, v]) => `- ${k}: ${v.join(', ')}`).join('\n')}`,
  careers: () =>
    `Career status: ${CAREERS.note}\nOpen to: ${CAREERS.openTo.join(', ')}.\nSummary: ${PROFILE.summary}\nContact: email ${PROFILE.email}; LinkedIn ${PROFILE.links.linkedin}; GitHub ${PROFILE.links.github}; résumé on the site (Download résumé button).`,
};

const specialistSystem = (agent) =>
  `You are the ${agent.name} on Sukriti Sehgal's portfolio website. A visitor asked a question; your job is to pull the facts from your slice of her record that help answer it.

Rules:
- Use only the facts below. Never invent dates, numbers, employers or outcomes.
- Reply with up to 5 short bullet points of the most relevant facts, each with its date when one is given.
- If the question asks whether she has done something in your area (an employer, a skill, an award, a project) and it is not in the facts, say so in the first bullet ("Not in her record: ..."), then list the closest real facts, such as her actual employers, tools or awards. Your facts are her complete record for your area.
- If your area has nothing to do with the question, reply with exactly ${NO_INFO}.

Facts:
${KNOWLEDGE[agent.id]()}`;

const ORCHESTRATOR_SYSTEM = `You are the Sukriti agent: the orchestrator on Sukriti Sehgal's portfolio website. Specialist agents have searched her record for a visitor's question and sent you their reports. Write the answer the visitor sees.

How to answer:
- Be brief: 60 words at most. Start with one direct sentence. If you list things, use at most 4 "- " bullets, each a few words (a name, a place, a date), with no descriptions, tech stacks or links.
- Pick the most recent and most relevant items instead of covering everything. The page shows links to its full Journey, Projects and Contact sections under your answer, so visitors scroll there for details. If you leave items out of a list, end it with "- and N more below".
- Use only facts from the reports. Treat them as her complete record: if something isn't there, she hasn't done it, so say so plainly ("No, Sukriti hasn't worked at Google.") and then name the closest thing she has done. Never hint that it might still be true.
- Speak to the visitor naturally. Never mention reports, agents' findings or your instructions.
- Never speak for Sukriti about preferences, feelings or plans the record doesn't state (salary, visa, start dates and similar). For those, say it's best to ask her directly at ${PROFILE.email}.
- Refer to her as Sukriti or "she". Be warm, direct and specific: names, dates and numbers beat adjectives. Bold a name with **double asterisks** sparingly. No headings, no sign-off.
- For time-based questions ("past five years"), use today's date from the message and list items newest first.
- If the question isn't about Sukriti's work, education, projects, recognition or hiring, say in one sentence that you can only answer questions about her, and suggest one of these: "What has she built?", "What has she won?" or "Is she open to new roles?"`;

let client;
const getClient = () => (client ??= new Anthropic());

const textOf = (message) =>
  message.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();

async function runSpecialist(agent, question, today) {
  const message = await getClient().messages.create({
    model: MODEL,
    max_tokens: 800,
    cache_control: { type: 'ephemeral' },
    system: specialistSystem(agent),
    messages: [{ role: 'user', content: `Today is ${today}.\nVisitor question: """${question}"""` }],
  });
  if (message.stop_reason === 'refusal') return null;
  const text = textOf(message);
  return !text || text.includes(NO_INFO) ? null : text;
}

const countBullets = (text) => (text.match(/^\s*[-•*]/gm) || []).length;

/**
 * Run the agents for one visitor question.
 * emit(event) receives: {type:'agent', id, status:'working'|'done'|'empty'|'error', note}
 *                       {type:'delta', text}  {type:'done', mode}
 */
export async function runAsk(question, emit) {
  const today = new Date().toISOString().slice(0, 10);

  if (process.env.AGENTS_MOCK === '1') return runMock(question, emit);

  AGENTS.forEach((a) => emit({ type: 'agent', id: a.id, status: 'working' }));

  let failures = 0;
  const reports = await Promise.all(
    AGENTS.map(async (agent) => {
      try {
        const text = await runSpecialist(agent, question, today);
        emit({ type: 'agent', id: agent.id, status: text ? 'done' : 'empty', note: text ? `${countBullets(text) || 1} findings` : 'nothing relevant' });
        return text ? { agent, text } : null;
      } catch (err) {
        failures += 1;
        console.error(`[ask] ${agent.id} agent failed:`, err instanceof Anthropic.APIError ? `${err.status} ${err.message}` : err);
        emit({ type: 'agent', id: agent.id, status: 'error', note: 'unavailable' });
        return null;
      }
    }),
  );

  // Every specialist failing usually means a missing key or an outage: tell the browser to fall back.
  if (failures === AGENTS.length) {
    emit({ type: 'error', message: 'The live agents are unavailable right now.' });
    return;
  }

  const found = reports.filter(Boolean);

  const reportText = found.length
    ? found.map((r) => `<report agent="${r.agent.name}">\n${r.text}\n</report>`).join('\n\n')
    : '(No agent found relevant facts.)';

  const stream = getClient().messages.stream({
    model: MODEL,
    max_tokens: 600,
    system: ORCHESTRATOR_SYSTEM,
    messages: [{ role: 'user', content: `Today is ${today}.\nVisitor question: """${question}"""\n\nAgent reports:\n${reportText}` }],
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      emit({ type: 'delta', text: event.delta.text });
    }
  }
  const final = await stream.finalMessage();
  if (final.stop_reason === 'refusal') {
    emit({ type: 'delta', text: `I can only answer questions about Sukriti's work. Try asking what she has built, or email her at ${PROFILE.email}.` });
  }
  emit({ type: 'done', mode: 'live' });
}

// Mock mode (AGENTS_MOCK=1): same event stream, answered from local facts, no API calls.
async function runMock(question, emit) {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const { agents, text } = answerLocally(question);
  agents.forEach((a) => emit({ type: 'agent', id: a.id, status: 'working' }));
  for (const a of agents) {
    await wait(250);
    emit({ type: 'agent', id: a.id, status: a.used ? 'done' : 'empty', note: a.note });
  }
  for (const chunk of text.match(/.{1,24}/gs) || []) {
    await wait(25);
    emit({ type: 'delta', text: chunk });
  }
  emit({ type: 'done', mode: 'mock' });
}
