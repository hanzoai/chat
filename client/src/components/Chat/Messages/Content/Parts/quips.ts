/**
 * What the assistant says while it has nothing to say yet.
 *
 * A quip is a sequence of BEATS — the unit of comic timing — written as one
 * sentence and split on its ellipses. The indicator shows one beat at a time,
 * so waiting longer earns more of the joke and the last beat is the punchline.
 * That makes the wait itself the material: a fast answer shows one honest word,
 * a slow one pays off.
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

export const QUIPS: string[] = [
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

/** How long a beat holds. Long enough to read, short enough to reach a punchline. */
export const BEAT_MS = 900;

/** These are English jokes; anything else gets the plain indicator. */
export const speaksEnglish = (language?: string): boolean =>
  (language ?? '').toLowerCase().startsWith('en');
