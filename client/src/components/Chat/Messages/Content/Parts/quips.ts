/**
 * What the assistant says while it has nothing to say yet.
 *
 * A quip is a sequence of BEATS — the unit of comic timing — written as one
 * sentence and split on its ellipses. The indicator shows one beat at a time,
 * so waiting longer earns more of the joke and the last beat is the punchline.
 * That makes the wait itself the material: a fast answer shows one honest word,
 * a slow one pays off.
 *
 * IT IS ABOUT WHAT YOU ASKED. A generic quip is a screensaver; one that knows
 * you asked for code, or a poem, or the difference between two things, reads as
 * the room having heard you. `quipFor` picks a pool by matching the prompt, and
 * falls back to the general pool when nothing matches — which is most of the
 * time, and is fine.
 *
 * NOTHING HERE CLAIMS AN ACTION. This is comic filler drawn next to a spinner,
 * not a status line: it does not know whether a search ran, a file was read or a
 * tool was called. So a quip may be absurd about the SUBJECT ("the oracle has
 * bad Wi-Fi") and must never assert a step ("Searching the web", "Reading your
 * file"). The first is a joke; the second is a fabricated progress report, and a
 * reader has no way to tell it from a real one. Anything that reports real work
 * belongs to the tool that did it.
 *
 * English only, and deliberately so. These turn on wordplay — carrying the two,
 * whether "double-checking" takes a hyphen, stalling at 97% for effect — and a
 * translation of a pun is not the pun. A UI in another language falls back to
 * the plain indicator rather than being shown English it did not ask for.
 */

/** One beat per ellipsis. The final beat keeps its own punctuation. */
export const beats = (quip: string): string[] =>
  quip
    .split(/\.\.\.\s*/)
    .map((b) => b.trim())
    .filter(Boolean);

export const GENERAL: string[] = [
  'Thinking... overthinking... catastrophizing... okay, here’s the simple answer.',
  'Bullshitting... bullshitting... bullshitting... kidding—deploying the graduate-level research.',
  'Consulting the oracle... the oracle is typing... the oracle has bad Wi-Fi... one moment.',
  'Reading the entire internet... regretting it... closing several tabs... forming an answer.',
  'Generating brilliance... detecting nonsense... deleting nonsense... presenting brilliance.',
  'Asking the council of robots... dramatic disagreement detected... arm wrestling initiated... consensus reached.',
  'Searching my memory... finding an embarrassing amount of trivia... ignoring most of it... answering now.',
  'Warming up the neurons... stretching the neurons... one neuron pulled a muscle... continuing anyway.',
  'Inventing a confident answer... checking whether it’s true... awkward pause... rewriting.',
  'Turning coffee into computation... computation into insight... insight into suspiciously tidy bullet points.',
  'Summoning expertise... expertise sent me to voicemail... improvising responsibly.',
  'Loading wisdom... 10%... 30%... 97%... stuck at 97% for dramatic effect.',
  'Performing advanced mathematics... carrying the two... losing the two... finding it under the desk.',
  'Consulting peer-reviewed research... consulting unreviewed gossip... choosing the research.',
  'Entering deep thought... going too deep... meeting a strange fish... returning with your answer.',
  'Parsing your question... questioning my existence... returning to your question... almost done.',
  'Connecting the dots... discovering one dot is actually a crumb... cleaning the screen... continuing.',
  'Sharpening the answer... too sharp... adding a safety cap... ready.',
  'Running the numbers... the numbers are resisting... negotiations underway... agreement reached.',
  'Activating genius mode... license expired... using competence mode instead.',
  'Building a theory... testing the theory... blaming the variables... fixing the theory.',
  'Looking for the perfect answer... lowering impossible standards... finding an excellent answer.',
  'Opening the vault of knowledge... entering the wrong code... pretending that didn’t happen... vault open.',
  'Separating facts from vibes... unusually high vibe levels detected... applying additional facts.',
  'Preparing a concise response... adding context... adding more context... deleting a small novel.',
  'Checking every possibility... checking several unnecessary possibilities... remembering the question... nearly there.',
  'Downloading expertise... buffering... buffering... okay, pretending I knew it all along.',
  'Simulating a room full of professors... one is asleep... two are arguing... the useful one has answered.',
  'Reading between the lines... getting lost between the lines... locating the exit... answer incoming.',
  'Applying critical thinking... applying unnecessary dramatic tension... removing dramatic tension... done.',
  'Searching for nuance... finding nuance... finding nuance inside the nuance... sending help.',
  'Converting confusion into clarity... clarity into prose... prose into something you’ll actually read.',
  'Checking the facts... double-checking the facts... checking whether "double-checking" needs a hyphen... moving on.',
  'Preparing groundbreaking insight... ground refuses to break... using the side entrance.',
  'Thinking outside the box... realizing the answer is inside the box... opening the box.',
  'Consulting my inner expert... my inner expert requested snacks... snacks approved... analysis resumed.',
  'Removing hallucinations... removing excessive confidence... adding one tasteful metaphor... ready.',
  'Solving the problem... admiring the solution... noticing the actual problem... solving that instead.',
  'Distilling centuries of human knowledge... spilling some... wiping the desk... serving what remains.',
  'Making it look effortless... effort intensifies... fans begin spinning... here’s your answer.',
];

/**
 * The topic pools. Each is matched by `test` against the prompt, and the FIRST
 * match wins — so the list is ordered most-specific first. A prompt that is
 * about nothing in particular gets GENERAL, which is most of them.
 *
 * The patterns are deliberately dumb. This decides which joke to tell, so a
 * wrong guess costs a slightly-off quip and nothing else; anything cleverer
 * (a classifier, a model call) would spend real latency and money on the text
 * shown while you wait for the thing you actually asked for.
 */
export const POOLS: { name: string; test: RegExp; quips: string[] }[] = [
  {
    name: 'code',
    test: /\b(code|coding|function|bug|debug|error|stack ?trace|refactor|typescript|javascript|python|rust|golang|sql|regex|api|compile|npm|git)\b|```/i,
    quips: [
      'Reading your code... admiring a variable named `data2`... saying nothing... proposing a rename.',
      'Finding the bug... the bug was load-bearing... rebuilding around the bug... fixed properly.',
      'Counting the brackets... losing count... starting again from the left... balanced.',
      'Considering a regex... remembering what happened last time... considering it anyway.',
      'Checking the edge cases... finding an edge on the edge case... sanding it down.',
      'Writing the elegant version... writing the version that runs... choosing the one that runs.',
      'Blaming the compiler... reading the error properly... apologizing to the compiler.',
      'Naming things... naming things... naming things... this is the hard part, honestly.',
    ],
  },
  {
    name: 'math',
    test: /\b(math|calculate|equation|solve for|derivative|integral|probability|statistics|algebra|percent|sum of)\b|[0-9]\s*[+\-*/^]\s*[0-9]/i,
    quips: [
      'Doing the arithmetic... doing it again on paper... the paper agrees... proceeding.',
      'Carrying the one... carrying the two... carrying more than I can hold... setting some down.',
      'Checking the units... the units are furious... apologizing to the units... converting.',
      'Estimating first... computing exactly... pleased to report they match.',
      'Consulting a proof... the proof has a gap... the gap has a proof... continuing.',
    ],
  },
  {
    name: 'write',
    test: /\b(write|writing|draft|essay|poem|story|email|blog|copy|headline|caption|rewrite|edit|tone)\b/i,
    quips: [
      'Writing the first line... deleting the first line... the second line is now the first line.',
      'Searching for the right word... finding four... holding auditions.',
      'Adding an adjective... removing three adjectives... net progress achieved.',
      'Drafting... redrafting... resisting the urge to use "delve"... done.',
      'Reaching for a metaphor... the metaphor collapses under weight... choosing a plain sentence.',
      'Counting the syllables... one syllable over... negotiating with the sentence.',
    ],
  },
  {
    name: 'image',
    test: /\b(image|picture|photo|draw|render|illustration|logo|diagram|sketch|painting)\b/i,
    quips: [
      'Picking a palette... too many blues... narrowing the blues... one blue remains.',
      'Composing the shot... moving everything two pixels left... much better.',
      'Counting the fingers... counting them again... a suspicious number... adjusting.',
      'Arranging the light... the light refuses... reasoning with the light.',
    ],
  },
  {
    name: 'compare',
    test: /\b(compare|versus|vs\.?|difference between|better than|pros and cons|trade-?offs?)\b/i,
    quips: [
      'Weighing both sides... one side is heavier... checking the scale... rebalancing.',
      'Building a fair comparison... catching myself having a favorite... starting over, fairly.',
      'Listing the pros... listing the cons... the lists are staring at each other.',
      'Finding the real difference... it is smaller than expected... saying so plainly.',
    ],
  },
  {
    name: 'explain',
    test: /\b(explain|what is|what are|how does|how do|why does|why do|eli5|teach me|meaning of)\b/i,
    quips: [
      'Simplifying... oversimplifying... putting some of the truth back... about right.',
      'Finding an analogy... the analogy has a hole... patching the analogy... it holds.',
      'Starting from first principles... going too far back... skipping ahead to the useful part.',
      'Removing the jargon... missing the jargon... explaining the jargon instead.',
    ],
  },
  {
    name: 'plan',
    test: /\b(plan|planning|schedule|itinerary|roadmap|steps|checklist|organize|strategy|budget)\b/i,
    quips: [
      'Making a plan... the plan has fourteen steps... nobody wants fourteen steps... making it five.',
      'Ordering the steps... step three depends on step seven... untangling.',
      'Estimating the time... doubling the estimate... being honest for once.',
      'Drawing the roadmap... the road has a fork... taking the interesting one.',
    ],
  },
  {
    name: 'decide',
    test: /\b(should i|help me (choose|decide|pick)|which (one|should)|recommend|advice)\b/i,
    quips: [
      'Considering the options... developing an opinion... checking the opinion is yours to have.',
      'Flipping a coin... the coin lands on its edge... doing the actual analysis.',
      'Listing what matters... noticing what really matters was third... reordering.',
    ],
  },
];

/**
 * The quip for a prompt: the first pool whose pattern matches, else GENERAL.
 *
 * The LAST LINE is tried first, and that is the whole trick. A long prompt is
 * usually a paste followed by the actual request — a stack trace, then "write
 * me a haiku about this". Matching the whole thing lets the paste decide, and
 * it is both bigger and louder than the request, so it always wins: sixty lines
 * of `TypeError` beat six words asking for a poem.
 *
 * When the last line says nothing useful ("thanks!", "?"), the broader tail is
 * tried — enough context to catch a real topic, capped so a novel-length paste
 * cannot swamp it either. Two passes, one rule each.
 */
const REQUEST_TAIL = 400;

export const poolFor = (prompt?: string): string[] => {
  const text = (prompt ?? '').trim();
  if (!text) {
    return GENERAL;
  }
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const lastLine = lines[lines.length - 1] ?? '';

  const match = (against: string) =>
    against ? POOLS.find((p) => p.test.test(against))?.quips : undefined;

  return match(lastLine) ?? match(text.slice(-REQUEST_TAIL)) ?? GENERAL;
};

/** Pick one, at random, from the pool the prompt earns. */
export const quipFor = (prompt?: string): string => {
  const pool = poolFor(prompt);
  return pool[Math.floor(Math.random() * pool.length)];
};

/** How long a beat holds. Long enough to read, short enough to reach a punchline. */
export const BEAT_MS = 900;

/** These are English jokes; anything else gets the plain indicator. */
export const speaksEnglish = (language?: string): boolean =>
  (language ?? '').toLowerCase().startsWith('en');
