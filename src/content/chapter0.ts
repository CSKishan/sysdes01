// Chapter 0 -- "What even is a server?" Five short, teach-only levels that
// exist purely so the dashboard and vocabulary in Chapter I mean something
// the first time they appear. No canvas yet: there is nothing to build
// until Chapter I introduces the first component.

import type { Chapter, Level } from './types'

const ch0Level0: Level = {
  id: 'ch0-l0',
  chapterId: 'ch0',
  order: 0,
  title: 'What Even Is System Design?',
  realConcept: 'System design',
  analogyName: "Taking over Packet & Post",
  stages: [
    {
      kind: 'situation',
      title: 'You just took over',
      body: [
        "Congratulations — you're the new owner of **Packet & Post**, a small delivery company with exactly one counter, one clerk, and a handful of regular customers. It's about to grow a lot, and every decision you make about how it's built is going to matter more as it does.",
        "Before you touch anything, it's worth being honest about what you're actually about to practice.",
      ],
    },
    {
      kind: 'teach',
      title: 'System design',
      body: [
        '**System design** is the process of defining the architecture, interfaces, and data for a system that satisfies specific requirements. In plain terms: deciding what pieces a system is made of, how they talk to each other, and where information actually lives — *before* (and while) you build it.',
        "It matters early because these decisions compound. A choice made on day one about how requests reach the system, or where data is stored, quietly shapes every choice after it — and some of them are very expensive to undo once real traffic and real data depend on them.",
        "Every level in this game follows the same shape: a situation at Packet & Post that mirrors a real system design problem, the real concept and term for it, then a chance to actually build it and watch real traffic either survive it or break it.",
      ],
      diagram: {
        steps: [
          { icon: '🏪', label: 'One counter today' },
          { icon: '📈', label: 'Growing demand' },
          { icon: '🌐', label: 'A real system' },
        ],
        caption: 'Every concept in this game exists because a small system like this one eventually stopped being small.',
      },
      readmeQuote: {
        text: 'System design helps us define a solution that meets the business requirements. It is one of the earliest decisions we can make when building a system. Often it is essential to think from a high level as these decisions are very difficult to correct later.',
        source: 'Getting Started · What is system design?',
      },
      realWorldExamples: [
        'Choosing a database before writing a single feature',
        'Sketching an architecture diagram in a system design interview',
      ],
      check: {
        question: 'Why do system design decisions tend to matter more the earlier they\'re made?',
        options: [
          { id: 'a', label: 'Because later decisions and real data end up depending on them, making them expensive to undo', correct: true, feedback: "Right — that's exactly why getting the shape of a system right early pays off." },
          { id: 'b', label: 'Because early decisions are always technically impossible to change', correct: false, feedback: "They're not impossible to change — just increasingly costly and risky the more depends on them." },
          { id: 'c', label: 'They don\'t — every decision matters equally regardless of timing', correct: false, feedback: "Timing does matter here: foundational choices ripple through everything built on top of them." },
        ],
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'Which best defines "system design" itself?',
      options: [
        { id: 'a', label: 'The process of defining the architecture, interfaces, and data for a system that satisfies specific requirements', correct: true, feedback: 'The definition, verbatim.' },
        { id: 'b', label: 'The process of writing and debugging application code', correct: false, feedback: "That's software engineering more broadly — system design is specifically about architecture, interfaces, and data." },
        { id: 'c', label: 'A checklist run only after a system is already in production', correct: false, feedback: "It's most valuable early, before the system exists — not as an after-the-fact audit." },
      ],
    },
    {
      id: 'q2',
      question: 'What is the actual cost of getting a foundational system design decision wrong early on?',
      options: [
        { id: 'a', label: 'Every later decision that depends on it becomes harder and riskier to unwind', correct: true, feedback: 'Right — the compounding-cost problem this level opens with.' },
        { id: 'b', label: 'Nothing — early decisions can always be swapped out for free later', correct: false, feedback: 'The opposite is usually true, especially once real data depends on the choice.' },
      ],
    },
  ],
}

const ch0Level1: Level = {
  id: 'ch0-l1',
  chapterId: 'ch0',
  order: 1,
  title: 'A Request and a Response',
  realConcept: 'Request / response',
  analogyName: 'Asking the clerk',
  stages: [
    {
      kind: 'situation',
      title: 'Welcome to Packet & Post',
      body: [
        "You've just taken over **Packet & Post**, a tiny delivery shop with one counter and one clerk. A customer walks up and asks: \"How much to send a parcel to Leeds?\"",
        'The clerk checks a price list, then answers. That\'s it. That\'s the whole transaction — and it\'s also, underneath the jargon, most of what a computer system does all day.',
      ],
    },
    {
      kind: 'teach',
      title: 'Request and response',
      body: [
        "In system design, the customer's question is called a **request**, and the clerk's answer is called a **response**. Whoever sends the request is the **client**. Whoever answers it is the **server**.",
        "That's really it. A web browser asking for a page is a client sending a request; the computer that answers with the page is a server sending a response. Everything in this course is variations on that one exchange, at bigger and bigger scale.",
      ],
      diagram: {
        steps: [
          { icon: '🙋', label: 'Client asks' },
          { icon: '🏪', label: 'Server' },
          { icon: '📄', label: 'Response' },
        ],
        caption: 'One request, one response — the smallest unit of every system in this game.',
      },
      readmeQuote: {
        text: 'System design is the process of defining the architecture, interfaces, and data for a system that satisfies specific requirements.',
        source: 'Getting Started · What is system design?',
      },
      realWorldExamples: ['Your browser loading a webpage', 'An app checking your bank balance'],
      check: {
        question: 'A customer asks the clerk for a price. Which part is the "request"?',
        options: [
          { id: 'a', label: 'The customer asking the question', correct: true, feedback: 'Right — the ask is the request, the answer is the response.' },
          { id: 'b', label: "The clerk's answer", correct: false, feedback: "That's the response — the answer, not the ask." },
          { id: 'c', label: 'The price list itself', correct: false, feedback: "The price list is data the server looks up. It's not the request or the response." },
        ],
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'Which one sends the request, and which one sends the response?',
      options: [
        { id: 'a', label: 'The client sends the request; the server sends the response', correct: true, feedback: 'Right — that direction never flips.' },
        { id: 'b', label: 'Either side can send either one, depending on the day', correct: false, feedback: "The roles are fixed for a given exchange: whoever asks is the client, whoever answers is the server." },
      ],
    },
    {
      id: 'q2',
      question: 'A web browser loading a page is an example of which role?',
      options: [
        { id: 'a', label: 'Client', correct: true, feedback: "Right — it's the one making the request." },
        { id: 'b', label: 'Server', correct: false, feedback: "The server is whatever answers the browser's request, not the browser itself." },
      ],
    },
  ],
}

const ch0Level2: Level = {
  id: 'ch0-l2',
  chapterId: 'ch0',
  order: 2,
  title: 'How Fast vs. How Many',
  realConcept: 'Latency vs. throughput',
  analogyName: 'One answer, fast — or many answers, steady',
  stages: [
    {
      kind: 'situation',
      title: 'Two very different complaints',
      body: [
        'Two customers complain about Packet & Post in the same week.',
        'The first says: "I waited two whole minutes just to get a price!" The second says: "There was no line, but by the time I finally got served, twenty other people were already waiting behind me."',
        "Those are two completely different problems, even though they both sound like \"the shop is slow.\"",
      ],
    },
    {
      kind: 'teach',
      title: 'Latency vs. throughput',
      body: [
        '**Latency** is how long *one* request takes, start to finish — the first customer\'s complaint. We measure it in time: milliseconds, seconds.',
        '**Throughput** is how *many* requests the system can get through per second — the second customer\'s complaint, really. A shop can have great latency (each customer served in 10 seconds) but terrible throughput if only one clerk works and fifty people show up at once.',
        "These two numbers can move independently, and almost every design decision in this course is really a trade-off between them.",
      ],
      diagram: {
        steps: [
          { icon: '⏱️', label: 'Latency: 1 request, how long?' },
          { icon: '🌊', label: 'Throughput: how many/sec?' },
        ],
        caption: 'Same shop, two different questions.',
      },
      readmeQuote: {
        text: 'Scalability is the measure of how well a system responds to changes by adding or removing resources to meet demands.',
        source: 'Chapter I · Scalability',
      },
      realWorldExamples: ['A single API call\'s response time (latency)', 'Requests-per-second a service can handle (throughput)'],
      check: {
        question: 'A checkout page takes 3 seconds to load for one shopper, but the store can serve 500 shoppers a second at once. What is "3 seconds"?',
        options: [
          { id: 'a', label: 'Latency', correct: true, feedback: "Right — it's the time for one request to complete." },
          { id: 'b', label: 'Throughput', correct: false, feedback: 'Throughput would be the "500 shoppers a second" part.' },
          { id: 'c', label: 'Capacity', correct: false, feedback: "Close in spirit, but the specific term for \"how long did one thing take\" is latency." },
        ],
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'A system could have great latency but terrible throughput. What would that look like?',
      options: [
        { id: 'a', label: 'Each individual request finishes quickly, but the system can only handle a few at a time', correct: true, feedback: "Right — like one very fast clerk who can only serve one customer at once." },
        { id: 'b', label: 'Every request is slow, but the system handles thousands at once', correct: false, feedback: "That's the opposite pairing — bad latency, good throughput." },
      ],
    },
    {
      id: 'q2',
      question: 'Which of these is a throughput number, not a latency number?',
      options: [
        { id: 'a', label: '"This service handles 2,000 requests per second"', correct: true, feedback: 'Right — a rate over time, not a duration for one request.' },
        { id: 'b', label: '"This API call takes 40ms"', correct: false, feedback: "That's latency — the time for one request." },
      ],
    },
  ],
}

const ch0Level3: Level = {
  id: 'ch0-l3',
  chapterId: 'ch0',
  order: 3,
  title: 'Requests Per Second',
  realConcept: 'RPS',
  analogyName: 'Counting customers through the door',
  stages: [
    {
      kind: 'situation',
      title: 'How busy is "busy"?',
      body: [
        'Your accountant asks how busy the shop really gets. "Busy" isn\'t a number she can plan around — she needs something she can compare week to week, shop to shop.',
      ],
    },
    {
      kind: 'teach',
      title: 'Requests per second (rps)',
      body: [
        'The standard unit for "how much traffic is this system handling" is **requests per second**, almost always written **rps**. If 4,000 customers ask for a price over the course of an hour, that\'s roughly 1 rps — small. If 4,000 ask in one second, that\'s 4,000 rps — a very different shop.',
        'Every dashboard you\'ll see from here on shows rps front and center, because it\'s the number everything else (latency, cost, whether something breaks) reacts to.',
      ],
      diagram: {
        steps: [
          { icon: '🙋', label: '' },
          { icon: '🙋', label: '' },
          { icon: '🙋', label: '' },
          { icon: '🏪', label: '= rps' },
        ],
        caption: 'How many requests arrive, per second — the single number that drives everything downstream.',
      },
      readmeQuote: {
        text: "This will be a read-heavy system, so let's assume a 100:1 read/write ratio with 100 million links generated per month... 100 million requests per month translate into 40 requests per second.",
        source: 'Chapter V · URL Shortener (Estimation and Constraints)',
      },
      realWorldExamples: ['A load balancer dashboard showing "12,400 rps"', 'Capacity planning ("this server handles 50 rps")'],
      check: {
        question: 'A shop serves 300 customers over one minute, at a perfectly steady pace. Roughly what is that in requests per second?',
        options: [
          { id: 'a', label: '5 rps', correct: true, feedback: '300 customers / 60 seconds = 5 rps. That\'s the conversion you\'ll do constantly in this course.' },
          { id: 'b', label: '300 rps', correct: false, feedback: "That would be 300 per second, i.e. 18,000 a minute — much busier than this shop." },
          { id: 'c', label: '30 rps', correct: false, feedback: 'Divide by 60 (seconds in a minute), not 10.' },
        ],
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'A system handles 18,000 requests over the course of one hour, evenly spread out. Roughly what is that in rps?',
      options: [
        { id: 'a', label: '5 rps', correct: true, feedback: '18,000 / 3,600 seconds = 5 rps.' },
        { id: 'b', label: '18 rps', correct: false, feedback: "That would be 18,000 requests per thousand seconds, not per hour." },
        { id: 'c', label: '300 rps', correct: false, feedback: "That's 18,000 divided by 60, not 3,600 (an hour has 3,600 seconds)." },
      ],
    },
    {
      id: 'q2',
      question: 'Why do dashboards standardize on requests-per-second rather than "requests per hour" or "per day"?',
      options: [
        { id: 'a', label: 'It gives a comparable, consistent unit that reacts quickly to real-time load changes', correct: true, feedback: "Right — per-second is granular enough to reflect what's happening right now." },
        { id: 'b', label: 'Per-second numbers are always smaller and easier to read', correct: false, feedback: "The size of the number isn't the point — comparability and responsiveness are." },
      ],
    },
  ],
}

const ch0Level4: Level = {
  id: 'ch0-l4',
  chapterId: 'ch0',
  order: 4,
  title: 'What "At Capacity" Means',
  realConcept: 'Utilization',
  analogyName: 'One clerk can only serve so many people',
  stages: [
    {
      kind: 'situation',
      title: 'The clerk has a limit',
      body: [
        'Your clerk can serve about 1 customer every 2 seconds — call it 0.5 customers per second, working flat out. On a quiet morning, 1 customer shows up every 10 seconds. No problem.',
        "But what happens if 2 customers a second start showing up — four times more than the clerk can actually handle?",
      ],
    },
    {
      kind: 'teach',
      title: 'Utilization and overload',
      body: [
        '**Utilization** is simply: *how much of a server\'s capacity is currently being used*, usually shown as a percentage. A clerk handling 0.25 of their 0.5-per-second capacity is at 50% utilization — comfortable.',
        "Here's the part that surprises people: as utilization climbs toward 100%, the wait for *each individual customer* doesn't rise gently — it rises steeply, then explodes. A shop at 50% busy might have a 10-second wait. The same shop at 95% busy might have a 10-*minute* wait. Being \"almost full\" is much worse than it sounds.",
        "That's why every server in this game shows a utilization bar, and why watching it creep toward the red matters more than watching the raw traffic number.",
      ],
      diagram: {
        steps: [
          { icon: '🙂', label: '50% busy' },
          { icon: '😬', label: '90% busy' },
          { icon: '🔥', label: '100%+ busy' },
        ],
        caption: 'Same clerk, same skill — the wait time doesn\'t scale evenly with how full the queue gets.',
      },
      readmeQuote: {
        text: 'Load balancing lets us distribute incoming network traffic across multiple resources ensuring high availability and reliability by sending requests only to resources that are online.',
        source: 'Chapter I · Load Balancing',
      },
      realWorldExamples: ['A "CPU utilization: 94%" alert', 'A database dashboard turning red before an outage'],
      check: {
        question: 'A server goes from 50% to 90% utilization. What should you expect to happen to how long each request waits?',
        options: [
          { id: 'a', label: 'It gets much worse — not just a little worse', correct: true, feedback: "Exactly the lesson: wait time rises steeply as utilization approaches 100%, not evenly." },
          { id: 'b', label: 'It roughly doubles, same as the utilization did', correct: false, feedback: 'It rises faster than that — the relationship isn\'t a straight line near capacity.' },
          { id: 'c', label: 'It stays about the same as long as no errors appear', correct: false, feedback: 'Latency climbs well before a server starts outright failing requests.' },
        ],
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'What does "100% utilization" mean for a server?',
      options: [
        { id: 'a', label: "It's using every bit of capacity it has — no room left for more work", correct: true, feedback: 'Right — fully saturated.' },
        { id: 'b', label: "It's running twice as fast as normal", correct: false, feedback: "Utilization measures how much of capacity is used, not speed." },
      ],
    },
    {
      id: 'q2',
      question: 'Why does "almost full" tend to be much worse than it sounds?',
      options: [
        { id: 'a', label: "Wait time rises steeply, not evenly, as utilization approaches 100%", correct: true, feedback: 'Right — the climb is steep near the ceiling, not gradual.' },
        { id: 'b', label: "It doesn't — wait time scales in a straight line with utilization", correct: false, feedback: 'It specifically does not scale linearly — that\'s the whole surprise.' },
      ],
    },
  ],
}

const ch0Level5: Level = {
  id: 'ch0-l5',
  chapterId: 'ch0',
  order: 5,
  title: 'Reading the Dashboard',
  realConcept: 'Dashboard literacy',
  analogyName: 'The board behind the counter',
  stages: [
    {
      kind: 'situation',
      title: 'One more thing before you start',
      body: [
        "From the next level onward, every time you run a design you'll see a small dashboard of numbers. Before you build anything, it's worth knowing what each one is actually telling you.",
      ],
    },
    {
      kind: 'teach',
      title: 'The five numbers you\'ll see',
      body: [
        '**p50 / p99 latency** — not the average. p50 is the *typical* request\'s wait; p99 is what the unluckiest 1-in-100 customers experience. p99 is usually the one that matters, because it\'s the one that gets complained about.',
        '**Completed (rps)** — how many requests per second actually got answered successfully.',
        '**Error rate** — the share of requests that got refused or dropped instead of answered. Anything above 0% means someone is being turned away.',
        '**Cost** — what this design costs to run per hour, since every real system has a budget, not just a performance target.',
        "You'll meet **cache hit rate** once caching is introduced in a few levels — it'll simply be missing from the dashboard until then.",
      ],
      readmeQuote: {
        text: 'A good system design requires us to think about everything, from infrastructure all the way down to the data and how it\'s stored.',
        source: 'Getting Started · What is system design?',
      },
      realWorldExamples: ['Grafana / Datadog dashboards showing p50/p99', 'An SRE\'s on-call view during an incident'],
      check: {
        question: 'Why do engineers usually care more about p99 latency than the average latency?',
        options: [
          { id: 'a', label: 'Because it shows what the worst-off users actually experience', correct: true, feedback: 'Right — the average can look fine while a real slice of users are having a bad time.' },
          { id: 'b', label: 'Because p99 is always a smaller, better-looking number', correct: false, feedback: "It's actually usually the largest, worst-looking number — that's the point." },
          { id: 'c', label: 'Because averages are mathematically impossible to compute for latency', correct: false, feedback: 'Averages are easy to compute — they just hide the bad experiences of a minority of users.' },
        ],
      },
    },
  ],
  quizQuestions: [
    {
      id: 'q1',
      question: 'A dashboard shows 0% error rate and low latency, but 0 completed requests per second. What should you suspect?',
      options: [
        { id: 'a', label: 'The system might be disconnected or unreachable rather than genuinely healthy', correct: true, feedback: 'Right — zero throughput with "perfect" other numbers is usually a red flag, not good news.' },
        { id: 'b', label: 'Everything is working perfectly', correct: false, feedback: "Zero completed traffic alongside zero errors usually means nothing is actually flowing through the system." },
      ],
    },
    {
      id: 'q2',
      question: 'Which dashboard number directly reflects what a system costs to run?',
      options: [
        { id: 'a', label: 'Cost per hour', correct: true, feedback: 'Right — the one number tied to budget rather than performance.' },
        { id: 'b', label: 'p99 latency', correct: false, feedback: "p99 is a performance number, not a budget number." },
      ],
    },
  ],
}

export const CHAPTER_0: Chapter = {
  id: 'ch0',
  order: 0,
  title: 'Getting Started',
  subtitle: 'What even is a server?',
  levelIds: [ch0Level0.id, ch0Level1.id, ch0Level2.id, ch0Level3.id, ch0Level4.id, ch0Level5.id],
}

export const CHAPTER_0_LEVELS: Level[] = [
  ch0Level0,
  ch0Level1,
  ch0Level2,
  ch0Level3,
  ch0Level4,
  ch0Level5,
]
