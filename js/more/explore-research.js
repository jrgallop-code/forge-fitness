const SAVED_KEY = "level_up_saved_research_v1";

const SITE_IMAGES = {
  hero: "https://images.pexels.com/photos/1547248/pexels-photo-1547248.jpeg?auto=compress&cs=tinysrgb&w=1400",
  volume: "https://images.pexels.com/photos/17959564/pexels-photo-17959564.jpeg?auto=compress&cs=tinysrgb&w=1200",
  femaleStrength: "https://images.pexels.com/photos/3757376/pexels-photo-3757376.jpeg?auto=compress&cs=tinysrgb&w=1200",
  carbs: "https://images.pexels.com/photos/18618315/pexels-photo-18618315.jpeg?auto=compress&cs=tinysrgb&w=1200",
  creatine: "https://images.pexels.com/photos/33921585/pexels-photo-33921585.jpeg?auto=compress&cs=tinysrgb&w=1200",
  supersets: "https://images.pexels.com/photos/24244667/pexels-photo-24244667.jpeg?auto=compress&cs=tinysrgb&w=1200",
  coldWater: "https://images.pexels.com/photos/7041577/pexels-photo-7041577.jpeg?auto=compress&cs=tinysrgb&w=1200",
  olderAdult: "https://images.pexels.com/photos/8846212/pexels-photo-8846212.jpeg?auto=compress&cs=tinysrgb&w=1200",
  womenTraining: "https://images.pexels.com/photos/15679569/pexels-photo-15679569.jpeg?auto=compress&cs=tinysrgb&w=1200",
  athlete: "https://images.pexels.com/photos/35439074/pexels-photo-35439074.jpeg?auto=compress&cs=tinysrgb&w=1200",
  recovery: "https://images.pexels.com/photos/3864083/pexels-photo-3864083.jpeg?auto=compress&cs=tinysrgb&w=1200",
  shaker: "https://images.pexels.com/photos/4378601/pexels-photo-4378601.jpeg?auto=compress&cs=tinysrgb&w=1200",
  salmon: "https://images.pexels.com/photos/36676405/pexels-photo-36676405.jpeg?auto=compress&cs=tinysrgb&w=1200",
  protein: "https://images.pexels.com/photos/769289/pexels-photo-769289.jpeg?auto=compress&cs=tinysrgb&w=1200",
  guideVolume: "https://images.pexels.com/photos/32172866/pexels-photo-32172866.jpeg?auto=compress&cs=tinysrgb&w=1200",
  mealPrep: "https://images.pexels.com/photos/18281697/pexels-photo-18281697.jpeg?auto=compress&cs=tinysrgb&w=1200",
  gymShaker: "https://images.pexels.com/photos/16513595/pexels-photo-16513595.jpeg?auto=compress&cs=tinysrgb&w=1200",
  rest: "https://images.pexels.com/photos/16216583/pexels-photo-16216583.jpeg?auto=compress&cs=tinysrgb&w=1200",
  rir: "https://images.pexels.com/photos/31255961/pexels-photo-31255961.jpeg?auto=compress&cs=tinysrgb&w=1200"
};

const CURATED = [
  {
    id: "volume-frequency-2026", topic: "Training Volume", tags: ["Muscle Growth", "Training Volume"], featured: true,
    title: "More weekly sets can produce more growth—but with diminishing returns",
    paperTitle: "The Resistance Training Dose Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency on Muscle Hypertrophy and Strength Gains",
    authors: "Pelland et al.", date: "February 2026", journal: "Sports Medicine", studyType: "Meta-analysis",
    sample: "67 studies · 2,058 participants", image: SITE_IMAGES.volume, sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/41343037/", pmid: "41343037",
    summary: "Across 67 studies, higher weekly training volume was associated with greater hypertrophy and strength gains, although the expected benefit became smaller as volume increased.",
    bottomLine: "Volume matters, but each additional set is likely to contribute less than the one before it.",
    studied: "The authors modelled weekly resistance-training volume and frequency against changes in muscle size and strength. Direct and indirect sets were counted separately.",
    found: "Hypertrophy and strength tended to improve as weekly volume increased. Frequency showed a clearer relationship with strength than hypertrophy when volume was considered.",
    practical: "Use enough weekly sets to create progress, then add volume only when performance and recovery support it. The study does not identify one perfect set target for everyone.",
    limitations: "Most participants were young adults and approximately four in five were male. Meta-regression can describe dose-response patterns but cannot guarantee the same response for every individual."
  },
  {
    id: "acsm-position-2026", topic: "Muscle Growth", tags: ["Muscle Growth", "Evidence Guide"],
    title: "ACSM updates its resistance-training position stand",
    paperTitle: "American College of Sports Medicine Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults",
    authors: "Currier et al.", date: "April 2026", journal: "Medicine & Science in Sports & Exercise", studyType: "Position stand",
    sample: "Overview of systematic reviews", image: SITE_IMAGES.femaleStrength, sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/41843416/", pmid: "41843416",
    summary: "The new position stand synthesizes the resistance-training evidence for strength, hypertrophy and physical performance, emphasizing consistent training and goal-specific programming over rigid universal rules.",
    bottomLine: "A sound program is consistent, progressive and adjusted to the individual—not built around one supposedly mandatory method.",
    studied: "An expert group reviewed the accumulated systematic-review evidence on resistance-training prescription in healthy adults.",
    found: "Multiple loading and programming approaches can work. The most useful choices depend on the outcome, the trainee and whether the program can be performed consistently.",
    practical: "Treat programming variables as tools. Start with a sustainable plan, track progress and make targeted changes when the data justify them.",
    limitations: "A position stand summarizes a broad evidence base and is not a personalized prescription. Individual medical or rehabilitation needs require qualified care."
  },
  {
    id: "carbohydrate-hypertrophy-2026", topic: "Nutrition", tags: ["Nutrition", "Carbohydrates"],
    title: "Higher carbohydrate intake may not independently increase hypertrophy",
    paperTitle: "The Effect of Carbohydrate Intake on Muscle Hypertrophy: A Systematic Review and Meta-Analysis",
    authors: "Henselmans et al.", date: "2026", journal: "Sports Medicine", studyType: "Systematic review",
    sample: "11 studies", image: SITE_IMAGES.carbs, sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/41712097/", pmid: "41712097",
    summary: "The pooled analysis did not find a significant independent hypertrophy benefit from higher carbohydrate intake, although the available trials were limited.",
    bottomLine: "Carbohydrates can support training performance, but eating more carbohydrate alone has not been shown to guarantee more muscle growth.",
    studied: "Eleven studies comparing different carbohydrate intakes were reviewed, including analyses limited to calorie-matched trials and direct muscle-size measurements.",
    found: "Higher carbohydrate intake was not associated with a statistically significant independent increase in hypertrophy across the pooled studies.",
    practical: "Set carbohydrates around calorie needs, training performance and preference. Do not interpret this as evidence that carbohydrates are unimportant for hard training.",
    limitations: "The result was limited by imprecision, moderate risk of bias and a small number of tightly controlled trials."
  },
  {
    id: "creatine-experience-2025", topic: "Supplements", tags: ["Supplements", "Creatine"],
    title: "Creatine benefits were seen in novice and experienced lifters",
    paperTitle: "Creatine Supplementation and Resistance Training: A Comparison Between Novice and Experienced Lifters",
    authors: "Ashtary-Larky et al.", date: "2025", journal: "Journal of the International Society of Sports Nutrition", studyType: "Systematic review",
    sample: "61 controlled trials", image: SITE_IMAGES.creatine, sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/41433021/", pmid: "41433021",
    summary: "Across 61 trials, creatine combined with resistance training increased fat-free mass compared with control conditions in both novice and experienced lifters.",
    bottomLine: "Prior training experience did not remove the potential body-composition benefit of creatine supplementation.",
    studied: "Controlled trials combining creatine with resistance training were pooled, with additional comparisons between trained and untrained participants.",
    found: "Creatine increased fat-free mass by about 1.39 kg on average. Experienced lifters showed numerically larger gains, but the difference between experience groups was not statistically significant.",
    practical: "Creatine monohydrate remains a well-supported option for suitable adults. Changes in fat-free mass can include water as well as muscle tissue.",
    limitations: "Trials varied in dose, duration, training programs and body-composition methods. The trained-versus-untrained difference was uncertain."
  },
  {
    id: "superset-review-2025", topic: "Training Methods", tags: ["Training Methods", "Supersets"],
    title: "Supersets appear useful when training time is limited",
    paperTitle: "Superset Versus Traditional Resistance Training Prescriptions: A Systematic Review and Meta-Analysis",
    authors: "Zhang et al.", date: "2025", journal: "Sports Medicine", studyType: "Systematic review",
    sample: "Resistance-training studies", image: SITE_IMAGES.supersets, sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/39903375/", pmid: "39903375",
    summary: "Superset training reduced session duration without clearly compromising training volume or longer-term adaptations compared with traditional set structures.",
    bottomLine: "Supersets can make training more time-efficient, but exercise pairing and fatigue still matter.",
    studied: "The review compared superset configurations with traditional resistance-training prescriptions across acute and longitudinal studies.",
    found: "Supersets generally shortened sessions while maintaining training volume and muscle activation. Longer-term outcomes did not clearly favour one structure.",
    practical: "Pair exercises that do not excessively interfere with one another, especially when performance on a priority lift matters.",
    limitations: "Superset types and study protocols varied, and the available long-term hypertrophy evidence remains smaller than the acute performance literature."
  },
  {
    id: "cold-water-recovery-2026", topic: "Training Methods", tags: ["Training Methods", "Recovery"],
    title: "Cold-water immersion may trade short-term recovery for some hypertrophy",
    paperTitle: "The cold-water immersion recovery-adaptation paradox: Reconciling acute parasympathetic and analgesic benefits with chronic hypertrophy attenuation",
    authors: "Tornero-Aguilera et al.", date: "August 2026", journal: "Experimental Physiology", studyType: "Narrative review",
    sample: "Review of acute and long-term evidence", image: SITE_IMAGES.coldWater, sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/42667675/", pmid: "42667675",
    summary: "Cold-water immersion can reduce soreness and speed perceived recovery, but repeated use immediately after resistance training may blunt some of the signalling and cellular processes involved in muscle growth.",
    bottomLine: "Ice baths can help when rapid recovery matters, but routine post-lifting use may be a poor fit when maximizing hypertrophy is the priority.",
    studied: "The authors brought together acute recovery research, molecular studies and longer-term resistance-training evidence on cold-water immersion.",
    found: "Protocols around 10–15°C for 10–15 minutes commonly reduced soreness and supported autonomic recovery. Repeated post-lifting exposure was associated with weaker hypertrophy-related signalling and modestly smaller adaptations in some studies.",
    practical: "Reserve cold-water immersion for situations where short turnaround between competitions or demanding sessions matters more than maximizing the growth response from that workout.",
    limitations: "This was a narrative review rather than a new pooled analysis. The effect depends on temperature, duration, timing and training goal, and not every study reports impaired growth."
  },
  {
    id: "protein-synbiotic-older-adults-2026", topic: "Nutrition", tags: ["Nutrition", "Protein"],
    title: "Protein plus resistance training improved strength in older adults with type 2 diabetes",
    paperTitle: "Synergistic effects of synbiotic, protein supplementation, and resistance training on inflammation, oxidative stress, and muscle strength in older adults with type 2 diabetes mellitus: a RCT triple-blinded study",
    authors: "Bastos et al.", date: "August 2026", journal: "European Journal of Nutrition", studyType: "Randomized controlled trial",
    sample: "51 randomized · 40 completed", image: SITE_IMAGES.olderAdult, sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/42616143/", pmid: "42616143",
    summary: "Older men with type 2 diabetes improved physical performance with resistance training. The protein group showed greater strength and insulin-resistance improvements, while adding a synbiotic did not provide a clear extra benefit.",
    bottomLine: "Resistance training and adequate protein appear useful in this clinical group; this trial did not show an additional advantage from the synbiotic product.",
    studied: "Men aged 65 or older with type 2 diabetes were assigned to control, protein, or synbiotic-plus-protein groups alongside resistance training.",
    found: "All groups improved physical performance. Protein supplementation was associated with larger strength gains and favourable changes in insulin resistance and selected oxidative-stress measures; the synbiotic added no clear benefit.",
    practical: "The most transferable message is to prioritize progressive resistance training and adequate dietary protein before adding more complex supplement combinations.",
    limitations: "Only 40 participants completed the trial, all were older men with type 2 diabetes, and biomarker changes do not automatically translate to better long-term health outcomes."
  },
  {
    id: "oral-contraceptives-hypertrophy-2026", topic: "Muscle Growth", tags: ["Muscle Growth", "Women"],
    title: "Oral contraceptives do not consistently appear to reduce muscle growth",
    paperTitle: "The Effects of Oral Contraceptives on Muscle Hypertrophy",
    authors: "Phillips, Misra & Raiser", date: "August 2026", journal: "International Journal of Sports Medicine", studyType: "Narrative review",
    sample: "Limited human evidence", image: SITE_IMAGES.womenTraining, sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/42562022/", pmid: "42562022",
    summary: "Current clinical studies do not show a consistent, clinically meaningful difference in hypertrophy between oral-contraceptive users and non-users, although a small number of studies report negative effects.",
    bottomLine: "The available evidence does not support assuming that oral contraceptive use will prevent meaningful muscle growth.",
    studied: "The review examined mechanistic and applied studies on hormonal contraceptives—primarily oral formulations—and resistance-training adaptations.",
    found: "Most studies did not find consistent differences in hypertrophy. Formulations containing more androgenic progestins were identified as one possible explanation for some conflicting findings.",
    practical: "Training quality, progression, recovery and nutrition remain the main controllable factors. Medication decisions should be made with a qualified healthcare professional, not from a gym-performance concern alone.",
    limitations: "The literature is small, contraceptive formulations vary, cohort sizes are often limited and the paper is a narrative rather than systematic review."
  },
  {
    id: "bfr-team-athletes-2026", topic: "Training Methods", tags: ["Training Methods", "Muscle Growth"],
    title: "Blood-flow restriction provided small muscle and strength benefits in team athletes",
    paperTitle: "Muscle hypertrophy and strength improvements following blood flow restriction combined with resistance training in team-athletes: a systematic review and meta-analysis",
    authors: "Huang et al.", date: "July 2026", journal: "Frontiers in Physiology", studyType: "Systematic review",
    sample: "12 studies · 859 athletes", image: SITE_IMAGES.athlete, sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/42549104/", pmid: "42549104",
    summary: "Adding blood-flow restriction to resistance training produced small improvements in hypertrophy and strength compared with resistance training alone, without a clear improvement in sprinting or jumping.",
    bottomLine: "BFR may be a useful load-management tool, but it is not a proven shortcut to better explosive sport performance.",
    studied: "Twelve studies involving team-sport athletes were pooled to compare resistance training with and without blood-flow restriction.",
    found: "The pooled effects favoured BFR for muscle size and strength. Explosive outcomes such as jumps and sprints did not significantly improve beyond resistance training alone.",
    practical: "BFR can be considered when heavy loading is limited or additional stimulus is useful, ideally with appropriate instruction and pressure selection.",
    limitations: "Protocols differed across studies, the hypertrophy effect was small and the findings do not establish an optimal BFR prescription."
  },
  {
    id: "large-volume-increase-2026", topic: "Training Volume", tags: ["Training Volume", "Muscle Growth"],
    title: "A large volume increase did not outperform a modest increase in trained lifters",
    paperTitle: "Large increases in resistance training volume do not impair muscle hypertrophy or anabolic-catabolic molecular signaling in trained individuals",
    authors: "Camargo et al.", date: "July 2026", journal: "Journal of Applied Physiology", studyType: "Randomized controlled trial",
    sample: "25 trained adults · 8 weeks", image: SITE_IMAGES.recovery, sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/42461790/", pmid: "42461790",
    summary: "Increasing weekly volume by 120% did not impair hypertrophy or molecular signalling, but it also did not produce more growth than a 20% increase over eight weeks.",
    bottomLine: "A dramatic jump in volume may be tolerable, but this study found no extra hypertrophy benefit over a modest progression.",
    studied: "Each participant trained both legs twice weekly; one leg received a 120% increase over habitual volume and the other a 20% increase.",
    found: "Both conditions increased muscle size. The much larger increase neither blunted adaptation nor improved hypertrophy compared with the modest increase.",
    practical: "Increase volume because progress and recovery data justify it—not because a larger jump automatically means faster growth.",
    limitations: "The study was short, included 25 adults and used unilateral lower-body training. It does not establish that very high volume is equally tolerable across longer programs or all muscles."
  },
  {
    id: "intra-workout-protein-carbs-2026", topic: "Nutrition", tags: ["Nutrition", "Protein", "Carbohydrates"],
    title: "Intra-workout protein added no detectable benefit in fed young men",
    paperTitle: "Effect of Intra-Workout Protein-Carbohydrate Co-Ingestion Versus Isocaloric Carbohydrate During Resistance Training on Muscle Fibre Hypertrophy and Oxidative Capacities in Young Men: A Randomized Controlled Trial",
    authors: "Svensson et al.", date: "July 2026", journal: "Nutrients", studyType: "Randomized controlled trial",
    sample: "17 young men · 8 weeks", image: SITE_IMAGES.shaker, sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/42514376/", pmid: "42514376",
    summary: "When training was performed in a fed state, carbohydrate plus protein during the workout did not significantly improve hypertrophy or performance compared with the same calories from carbohydrate alone.",
    bottomLine: "If you have eaten before training, adding protein during a typical lifting session may offer little extra benefit beyond meeting daily protein needs.",
    studied: "Seventeen physically active young men completed eight weeks of supervised training while consuming either carbohydrate-plus-protein or calorie-matched carbohydrate during workouts.",
    found: "Both groups gained muscle, strength and lean mass. No statistically significant between-group difference was detected for any measured outcome.",
    practical: "Prioritize total daily protein and a workable pre- or post-training meal. Intra-workout protein remains optional rather than essential for most lifters.",
    limitations: "This was a small exploratory trial with only 17 completers, so modest differences could have been missed. Results may not apply to long fasted sessions or other populations."
  },
  {
    id: "omega3-hypertrophy-2026", topic: "Supplements", tags: ["Supplements", "Nutrition"],
    title: "Omega-3 supplementation did not increase hypertrophy in protein-sufficient men",
    paperTitle: "Effects of n-3 PUFA supplementation during resistance training on muscle outcomes in healthy adult men: a randomised clinical trial",
    authors: "Santo Andre et al.", date: "July 2026", journal: "British Journal of Nutrition", studyType: "Randomized controlled trial",
    sample: "46 trained men · 14 weeks", image: SITE_IMAGES.salmon, sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/42415329/", pmid: "42415329",
    summary: "Despite substantial omega-3 incorporation into muscle tissue, supplementation did not improve hypertrophy, strength or anabolic signalling beyond supervised training in healthy men already eating at least 1.6 g/kg/day of protein.",
    bottomLine: "Omega-3s may have other health uses, but this trial did not support taking them specifically to build more muscle in protein-sufficient trained men.",
    studied: "Forty-six resistance-trained men received either 6.3 g/day of omega-3 PUFA or placebo during 14 weeks of supervised lower-body training.",
    found: "Both groups improved muscle size and strength. Omega-3 supplementation did not add a measurable advantage for hypertrophy, strength or mTOR-related signalling.",
    practical: "Do not treat omega-3 supplements as a hypertrophy requirement. Base any use on diet, health context and professional advice rather than a promised muscle-building effect.",
    limitations: "The trial involved healthy adult men with adequate protein intake and focused on lower-body training. Other populations or health outcomes were not tested."
  }
];

const GUIDES = [
  {
    id: "guide-volume", topic: "Evidence Guides", tags: ["Training Volume", "Muscle Growth"], guide: true,
    title: "Weekly training volume: finding the useful dose",
    paperTitle: "The Resistance Training Dose Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency on Muscle Hypertrophy and Strength Gains",
    authors: "Level Up evidence guide · Pelland et al.", date: "Updated August 2026", journal: "Sports Medicine", studyType: "Evidence guide",
    sample: "Built from 67 studies", image: SITE_IMAGES.guideVolume, sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/41343037/", pmid: "41343037",
    summary: "More weekly hard sets generally support more hypertrophy, but the return from each additional set becomes smaller. The best volume is the amount that still lets you recover and progress.",
    bottomLine: "Start with a recoverable dose, measure progress, and add sets only when there is a clear reason.",
    studied: "The central source modelled 67 resistance-training studies and 2,058 participants, while the guide places those findings alongside practical progression and recovery considerations.",
    found: "Weekly set volume showed a positive but diminishing relationship with hypertrophy. Training frequency mattered less for growth once total weekly volume was considered.",
    practical: "Distribute quality sets across the week, keep most working sets sufficiently challenging, and avoid adding volume when performance, soreness or motivation are already deteriorating.",
    limitations: "Research averages cannot define one perfect set target. Exercise selection, effort, training age, muscle group and individual recovery all change how much volume is productive."
  },
  {
    id: "guide-protein", topic: "Evidence Guides", tags: ["Nutrition", "Protein"], guide: true,
    title: "Protein for muscle growth: the daily target matters most",
    paperTitle: "A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults",
    authors: "Level Up evidence guide · Morton et al.", date: "Reviewed August 2026", journal: "British Journal of Sports Medicine", studyType: "Evidence guide",
    sample: "49 studies · 1,863 participants", image: SITE_IMAGES.protein, sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/28698222/", pmid: "28698222",
    summary: "Protein supplementation can modestly improve muscle and strength gains when it helps someone reach an adequate daily intake. Benefits appear to level off around 1.6 g/kg/day for many healthy adults.",
    bottomLine: "Consistently reach an adequate daily protein intake before worrying about special powders or minute-by-minute timing.",
    studied: "The meta-analysis pooled randomized trials lasting at least six weeks that combined resistance training with protein supplementation.",
    found: "Supplementation modestly improved strength, fat-free mass and muscle-size measures. The estimated breakpoint for additional fat-free-mass benefit was about 1.62 g/kg/day of total protein.",
    practical: "Use roughly 1.6 g/kg/day as a strong general target, spread protein across meals for convenience and meal quality, and choose foods or supplements that fit your diet.",
    limitations: "The breakpoint is a population estimate rather than a ceiling for every individual, and fat-free mass is not identical to newly built contractile muscle."
  },
  {
    id: "guide-creatine", topic: "Evidence Guides", tags: ["Supplements", "Creatine"], guide: true,
    title: "Creatine monohydrate: what the evidence actually supports",
    paperTitle: "Creatine Supplementation and Resistance Training: A Comparison Between Novice and Experienced Lifters",
    authors: "Level Up evidence guide · Ashtary-Larky et al.", date: "Updated August 2026", journal: "Journal of the International Society of Sports Nutrition", studyType: "Evidence guide",
    sample: "61 controlled trials", image: SITE_IMAGES.gymShaker, sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/41433021/", pmid: "41433021",
    summary: "Creatine combined with resistance training increases fat-free mass on average, and the available evidence does not suggest that experienced lifters stop benefiting.",
    bottomLine: "Creatine monohydrate is one of the best-supported optional supplements for suitable adults, but it does not replace training or nutrition.",
    studied: "Controlled trials of creatine plus resistance training were pooled, including analyses comparing novice and experienced lifters.",
    found: "Creatine increased fat-free mass by about 1.39 kg on average. Training experience did not produce a statistically reliable difference in the size of the benefit.",
    practical: "A simple maintenance approach is typically sufficient; loading is optional. Expect some early scale-weight gain from increased water stored in muscle.",
    limitations: "Fat-free mass includes water, protocols varied, and anyone with a relevant medical condition should discuss supplementation with a healthcare professional."
  },
  {
    id: "guide-carbs", topic: "Evidence Guides", tags: ["Nutrition", "Carbohydrates"], guide: true,
    title: "Carbohydrates: fuel for training, not a direct hypertrophy switch",
    paperTitle: "The Effect of Carbohydrate Intake on Muscle Hypertrophy: A Systematic Review and Meta-Analysis",
    authors: "Level Up evidence guide · Henselmans et al.", date: "Updated August 2026", journal: "Sports Medicine", studyType: "Evidence guide",
    sample: "11 studies", image: SITE_IMAGES.mealPrep, sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/41712097/", pmid: "41712097",
    summary: "Higher carbohydrate intake has not been shown to independently guarantee more hypertrophy, but carbohydrates can support training quality, glycogen availability and dietary adherence.",
    bottomLine: "Set carbohydrates around total calories, performance and preference rather than chasing one universal muscle-building number.",
    studied: "The review pooled studies comparing different carbohydrate intakes and included calorie-matched and direct muscle-size sensitivity analyses.",
    found: "No statistically significant independent hypertrophy advantage was detected for higher carbohydrate intake. Few tightly controlled trials were available.",
    practical: "After protein and calorie needs are covered, use carbohydrates to support demanding sessions and choose an amount that keeps training performance and the diet sustainable.",
    limitations: "Few tightly controlled trials were available, diets and training programs differed, and a null independent effect does not mean carbohydrates are irrelevant to performance."
  },
  {
    id: "guide-rir", topic: "Evidence Guides", tags: ["Training Methods", "Muscle Growth"], guide: true,
    title: "Reps in reserve: how close to failure should sets go?",
    paperTitle: "Exploring the Dose-Response Relationship Between Estimated Resistance Training Proximity to Failure, Strength Gain, and Muscle Hypertrophy: A Series of Meta-Regressions",
    authors: "Level Up evidence guide · Robinson et al.", date: "Reviewed August 2026", journal: "Sports Medicine", studyType: "Evidence guide",
    sample: "Series of meta-regressions", image: SITE_IMAGES.rir, sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/38970765/", pmid: "38970765",
    summary: "Hypertrophy tended to improve as sets ended closer to failure, while strength gains were similar across a wider range of reps in reserve. Exact RIR prescriptions remain uncertain.",
    bottomLine: "Most hypertrophy work should be challenging, but every set does not need to reach complete failure.",
    studied: "The authors converted training interventions into estimated reps in reserve and modelled the relationship with hypertrophy and strength outcomes.",
    found: "Muscle growth showed a meaningful trend toward better outcomes closer to failure. Strength did not show the same clear dose-response relationship.",
    practical: "A useful default is to finish many working sets with roughly 1–3 good reps left, using failure selectively when it is safe and does not compromise later work.",
    limitations: "RIR had to be estimated from study descriptions, the models were exploratory, and people vary in how accurately they judge proximity to failure."
  },
  {
    id: "guide-rest", topic: "Evidence Guides", tags: ["Training Methods", "Muscle Growth"], guide: true,
    title: "Rest between sets: long enough to protect performance",
    paperTitle: "Give it a rest: a systematic review with Bayesian meta-analysis on the effect of inter-set rest interval duration on muscle hypertrophy",
    authors: "Level Up evidence guide · Singer et al.", date: "Reviewed August 2026", journal: "Frontiers in Sports and Active Living", studyType: "Evidence guide",
    sample: "9 studies · 19 muscle measurements", image: SITE_IMAGES.rest, sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/39205815/", pmid: "39205815",
    summary: "Rest periods longer than 60 seconds may provide a small hypertrophy advantage, probably because they help preserve repetitions and training volume. Benefits beyond roughly 90 seconds were less clear in the pooled data.",
    bottomLine: "Rest long enough to perform the next set well; rushing the clock is not automatically better for growth.",
    studied: "The review pooled randomized comparisons of different inter-set rest periods while other training variables were controlled.",
    found: "Results substantially overlapped, but central estimates modestly favoured rest periods over 60 seconds. The analysis did not detect a clear additional hypertrophy benefit beyond 90 seconds.",
    practical: "Use longer rests for demanding compound lifts and when repetitions drop sharply. Shorter rests can work for smaller isolation exercises when performance remains stable.",
    limitations: "Only nine studies qualified, results were heterogeneous, and the categories cannot identify one ideal rest duration for every exercise and trainee."
  }
];

let activeTab = "new";
let activeTopic = "All";
const feedStatus = `${CURATED.length} studies reviewed and summarized by Level Up.`;

const escapeHtml = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

function getSaved() {
  try { return new Set(JSON.parse(localStorage.getItem(SAVED_KEY) || "[]")); } catch { return new Set(); }
}

function setSaved(saved) { localStorage.setItem(SAVED_KEY, JSON.stringify([...saved])); }

function allArticles() { return [...CURATED, ...GUIDES]; }
function articleById(id) { return allArticles().find(article => article.id === id); }

function renderResearchCard(article, saved) {
  return `<article class="explore-study-card${article.featured ? " is-featured" : ""}" data-explore-topic-value="${escapeHtml(article.topic)}">
    <button class="explore-study-image" type="button" data-explore-open="${escapeHtml(article.id)}" style="--study-image:url('${escapeHtml(article.image)}')" aria-label="Read ${escapeHtml(article.title)}"><span>${escapeHtml(article.topic)}</span></button>
    <div class="explore-study-body"><div class="explore-study-meta"><span>${escapeHtml(article.studyType)}</span><span>${escapeHtml(article.date)}</span></div>
    <button class="explore-study-title" type="button" data-explore-open="${escapeHtml(article.id)}"><strong>${escapeHtml(article.title)}</strong></button>
    <p>${escapeHtml(article.summary)}</p><div class="explore-study-footer"><span>${escapeHtml(article.authors)}</span><button class="explore-save${saved.has(article.id) ? " is-saved" : ""}" type="button" data-explore-save="${escapeHtml(article.id)}" aria-label="${saved.has(article.id) ? "Remove from saved research" : "Save research"}">${saved.has(article.id) ? "Saved" : "Save"}</button></div></div>
  </article>`;
}

function visibleArticles() {
  const saved = getSaved();
  let source = activeTab === "guides" ? GUIDES : activeTab === "saved" ? allArticles().filter(article => saved.has(article.id)) : CURATED;
  if (activeTopic !== "All") source = source.filter(article => article.topic === activeTopic || article.tags?.includes(activeTopic));
  return source;
}

function renderFeed() {
  const target = document.querySelector("[data-explore-feed]");
  if (!target) return;
  const saved = getSaved();
  const articles = visibleArticles();
  target.innerHTML = articles.length ? articles.map(article => renderResearchCard(article, saved)).join("") : `<div class="explore-empty"><strong>${activeTab === "saved" ? "No saved research yet" : "No articles in this filter"}</strong><p>${activeTab === "saved" ? "Tap Save on any research card to build your reading list." : "Choose another topic to continue exploring."}</p></div>`;
  const status = document.querySelector("[data-explore-feed-status]");
  if (status) status.textContent = activeTab === "new" ? feedStatus : activeTab === "guides" ? "Level Up explainers grounded in the wider evidence base." : `${articles.length} saved item${articles.length === 1 ? "" : "s"}.`;
  document.querySelectorAll("[data-explore-tab]").forEach(button => button.classList.toggle("active", button.dataset.exploreTab === activeTab));
  document.querySelectorAll("[data-explore-topic]").forEach(button => button.classList.toggle("active", button.dataset.exploreTopic === activeTopic));
}

function renderExplorePage() {
  const topics = ["All", "Muscle Growth", "Training Volume", "Training Methods", "Nutrition", "Supplements"];
  return `<section class="explore-page">
    <header class="explore-hero" style="--explore-hero:url('${SITE_IMAGES.hero}')"><div class="explore-hero-shade"></div><div class="explore-hero-content"><button class="explore-back" type="button" data-explore-back>← More</button><span class="eyebrow">LEVEL UP · RESEARCH</span><h1>Train with the evidence.</h1><p>New muscle-growth and nutrition research, translated into useful context without turning one paper into a rule.</p><div class="explore-hero-facts"><span><b>Reviewed</b> summaries</span><span><b>Direct</b> study links</span><span><b>Saved</b> reading list</span></div></div></header>
    <nav class="explore-tabs" aria-label="Explore sections"><button class="active" type="button" data-explore-tab="new">New Research</button><button type="button" data-explore-tab="guides">Evidence Guides</button><button type="button" data-explore-tab="saved">Saved</button></nav>
    <section class="explore-intro"><div><span class="eyebrow">CURRENT LITERATURE</span><h2>What’s worth knowing now</h2></div><p>Prioritized toward systematic reviews, meta-analyses, position stands and controlled human research.</p></section>
    <div class="explore-topics" aria-label="Filter by topic">${topics.map(topic => `<button class="${topic === activeTopic ? "active" : ""}" type="button" data-explore-topic="${escapeHtml(topic)}">${escapeHtml(topic)}</button>`).join("")}</div>
    <div class="explore-feed-heading"><strong>${activeTab === "new" ? "Latest research" : activeTab === "guides" ? "Evidence guides" : "Saved research"}</strong><span data-explore-feed-status>${escapeHtml(feedStatus)}</span></div>
    <section class="explore-feed" data-explore-feed></section>
    <aside class="explore-method"><span>HOW LEVEL UP HANDLES RESEARCH</span><h3>Every paper receives context—not just a headline.</h3><p>Each research card now includes a plain-language summary, the main result, practical meaning and important limitations. No abstract-only or automatically published cards appear in Explore.</p></aside>
  </section>`;
}

function renderStudyDetail(article) {
  const saved = getSaved();
  const sections = [["What was studied", article.studied], ["What the researchers found", article.found], ["What it may mean in practice", article.practical], ["Important limitations", article.limitations]];
  return `<article class="explore-detail"><header class="explore-detail-hero" style="--explore-hero:url('${escapeHtml(article.image)}')"><div class="explore-hero-shade"></div><div><button class="explore-back" type="button" data-explore-detail-back>← Explore</button><span class="eyebrow">${escapeHtml(article.topic)}</span><h1>${escapeHtml(article.title)}</h1><div class="explore-study-meta"><span>${escapeHtml(article.studyType)}</span><span>${escapeHtml(article.date)}</span></div></div></header>
    <section class="explore-detail-summary"><span>THE BOTTOM LINE</span><h2>${escapeHtml(article.bottomLine)}</h2><p>${escapeHtml(article.summary)}</p></section>
    <section class="explore-detail-grid">${sections.map(([title, body], index) => `<section><b>0${index + 1}</b><div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></div></section>`).join("")}</section>
    <section class="explore-citation"><div><span>ORIGINAL PUBLICATION</span><strong>${escapeHtml(article.paperTitle)}</strong><small>${escapeHtml(article.authors)} · ${escapeHtml(article.journal)}${article.pmid ? ` · PMID ${escapeHtml(article.pmid)}` : ""}</small></div><div class="explore-citation-actions"><button class="explore-save${saved.has(article.id) ? " is-saved" : ""}" type="button" data-explore-save="${escapeHtml(article.id)}">${saved.has(article.id) ? "Saved" : "Save"}</button><a href="${escapeHtml(article.sourceUrl)}" target="_blank" rel="noopener noreferrer">View study ↗</a></div></section>
    <p class="explore-disclaimer">Educational information only. Research summaries do not replace individualized medical, nutrition or training advice.</p></article>`;
}

function bindExploreEvents(content) {
  content.querySelector("[data-explore-back]")?.addEventListener("click", () => document.querySelector('.nav-btn[data-page="more"]')?.click());
  content.querySelectorAll("[data-explore-tab]").forEach(button => button.addEventListener("click", () => { activeTab = button.dataset.exploreTab; activeTopic = "All"; renderFeed(); }));
  content.querySelectorAll("[data-explore-topic]").forEach(button => button.addEventListener("click", () => { activeTopic = button.dataset.exploreTopic; renderFeed(); }));
  content.querySelector("[data-explore-feed]")?.addEventListener("click", handleExploreClick);
}

function handleExploreClick(event) {
  const saveButton = event.target.closest("[data-explore-save]");
  if (saveButton) { toggleSaved(saveButton.dataset.exploreSave); renderFeed(); return; }
  const openButton = event.target.closest("[data-explore-open]");
  if (openButton) openStudy(openButton.dataset.exploreOpen);
}

function toggleSaved(id) {
  const saved = getSaved();
  saved.has(id) ? saved.delete(id) : saved.add(id);
  setSaved(saved);
}

function openStudy(id) {
  const article = articleById(id);
  const content = document.getElementById("content");
  if (!article || !content) return;
  content.innerHTML = renderStudyDetail(article);
  content.querySelector("[data-explore-detail-back]")?.addEventListener("click", openExploreResearch);
  content.querySelector("[data-explore-save]")?.addEventListener("click", event => { toggleSaved(id); event.currentTarget.textContent = getSaved().has(id) ? "Saved" : "Save"; event.currentTarget.classList.toggle("is-saved", getSaved().has(id)); });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function openExploreResearch() {
  const content = document.getElementById("content");
  if (!content) return;
  content.innerHTML = renderExplorePage();
  bindExploreEvents(content);
  renderFeed();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
