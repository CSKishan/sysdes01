// Chapter V -- Case Studies. This file holds only the one teach-only level
// that fits the existing Level/LevelStage shape: "System Design Interviews"
// itself is the meta-framework the five real case studies (URL Shortener,
// WhatsApp, Twitter, Netflix, Uber) each walk through -- it isn't a system
// to design, so unlike them it doesn't need the new CaseStudy type family.
// The five case studies live in src/content/caseStudies/ and are played
// through their own mode (src/ui/casestudy/), not the campaign map.

import type { Chapter, Level } from './types'

const ch5Interviews: Level = {
  id: 'ch5-interviews',
  chapterId: 'ch5',
  order: 1,
  title: 'Seven Questions, In Order',
  realConcept: 'System design interview strategy',
  analogyName: 'The framework every case study below follows',
  stages: [
    {
      kind: 'situation',
      title: 'A blank whiteboard and a vague question',
      body: [
        '"Design a URL shortener." That\'s the whole prompt. No requirements list, no traffic numbers, no hint of what "done" looks like. Every case study from here on starts exactly like this — and the difference between a strong answer and a weak one is rarely the final diagram. It\'s the order you got there in.',
      ],
    },
    {
      kind: 'teach',
      title: 'The seven-step framework',
      body: [
        'System design interview questions are deliberately vague — they\'re testing your process, not a memorized answer. The unique part is that it\'s a **two-way conversation**: the interviewer expects you to ask questions, not silently produce a diagram.',
        '**1. Requirements clarification** — split what you\'re asked to build into **functional** (what the system must do), **non-functional** (quality constraints like latency and availability), and **extended** (nice-to-haves) requirements. **2. Estimation and constraints** — scale, read/write ratio, requests per second, storage — the numbers that will justify every design choice that follows. **3. Data model design** — the entities and relationships, before any boxes get drawn. **4. API design** — the interface contract, kept simple. **5. High-level component design** — now the boxes: load balancers, services, databases. **6. Detailed design** — go deep on the parts that matter, with trade-offs, not just answers. **7. Identify and resolve bottlenecks** — single points of failure, replicas, sharding, cache availability.',
        'Every case study ahead is structured around steps 1, 2, and a build stage that folds together 3 through 7 into one open canvas, ending in a rubric review instead of a pass/fail — because in a real interview, there is no single correct diagram, only better and worse justified ones.',
      ],
      diagram: {
        steps: [
          { icon: '❓', label: 'Requirements' },
          { icon: '🔢', label: 'Estimation' },
          { icon: '🗂️', label: 'Data model' },
          { icon: '🔌', label: 'API design' },
          { icon: '📐', label: 'High-level design' },
          { icon: '🔍', label: 'Detailed design' },
          { icon: '⚠️', label: 'Bottlenecks' },
        ],
        caption: 'Each step justifies the next -- estimation numbers shape the data model, the data model shapes the API, and so on.',
      },
      readmeQuote: {
        text: "System design interview questions, by nature, are vague or abstract. Asking questions about the exact scope of the problem, and clarifying functional requirements early in the interview is essential.",
        source: 'Chapter V · System Design Interviews (Requirements clarifications)',
      },
      realWorldExamples: ['Every FAANG-style system design interview loop', 'Real incident postmortems, which follow a similar clarify-then-diagnose structure'],
      check: {
        question: 'What is the "unique aspect" of a system design interview, per the README?',
        options: [
          { id: 'a', label: 'The two-way, conversational nature between candidate and interviewer', correct: true, feedback: "Right — it's collaborative, not a silent whiteboard test." },
          { id: 'b', label: 'There is exactly one correct final architecture the candidate must reach', correct: false, feedback: "The README explicitly says these questions aren't designed for a single specific answer." },
        ],
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'What are the three categories requirements are typically split into?',
      options: [
        { id: 'a', label: 'Functional, non-functional, and extended', correct: true, feedback: 'Right, verbatim from the README.' },
        { id: 'b', label: 'Frontend, backend, and infrastructure', correct: false, feedback: "That's a layer split, not the README's requirements taxonomy." },
      ],
    },
    {
      id: 'q2',
      question: 'Per the README, what should you generally avoid doing when discussing technology trade-offs in an interview?',
      options: [
        { id: 'a', label: 'Being overly opinionated (e.g. flatly declaring one technology "just better")', correct: true, feedback: "Right — the README specifically warns against this, favoring humility about what you do and don't know." },
        { id: 'b', label: 'Mentioning any specific real-world technology by name', correct: false, feedback: "Naming real technologies is fine and common — the caution is specifically about being dogmatic, not about naming tools." },
      ],
    },
    {
      id: 'q3',
      question: 'Why does the README recommend estimation and constraints come early, right after requirements?',
      options: [
        { id: 'a', label: "Because the scale numbers (traffic, storage, read/write ratio) will justify and shape every design decision that follows", correct: true, feedback: 'Right — the numbers come first because they drive everything downstream.' },
        { id: 'b', label: 'Because interviewers only allot time for estimation if it happens first', correct: false, feedback: "The README's reasoning is about design justification, not interview time-slot rules." },
      ],
    },
  ],
}

export const CHAPTER_5: Chapter = {
  id: 'ch5',
  order: 5,
  title: 'Chapter V · Case Studies',
  subtitle: 'The interview framework, then five open-ended systems to design',
  levelIds: [ch5Interviews.id],
}

export const CHAPTER_5_LEVELS: Level[] = [ch5Interviews]
