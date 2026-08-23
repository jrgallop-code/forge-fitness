const ex = (id, sets, reps) => ({ id, sets, reps });
const day = (name, exercises) => ({ name, exercises });
const rotate = (items, amount) => items.map((_, index) => items[(index + amount) % items.length]);

const push = ["barbell-bench-press", "incline-dumbbell-press", "machine-chest-press", "dumbbell-shoulder-press", "lateral-raise", "tricep-pushdown"];
const pull = ["pull-up", "barbell-row", "lat-pulldown", "chest-supported-row", "face-pull", "dumbbell-curl"];
const legs = ["back-squat", "romanian-deadlift", "leg-press", "bulgarian-split-squat", "leg-curl", "standing-calf-raise"];
const athletic = ["goblet-squat", "dumbbell-bench-press", "single-arm-dumbbell-row", "lunge", "overhead-press", "hanging-knee-raise"];
const upper = ["incline-barbell-press", "seated-cable-row", "dumbbell-shoulder-press", "lat-pulldown", "cable-fly", "hammer-curl"];
const lower = ["front-squat", "romanian-deadlift", "hip-thrust", "leg-extension", "seated-leg-curl", "seated-calf-raise"];
const chestBack = ["barbell-bench-press", "pull-up", "incline-dumbbell-press", "barbell-row", "cable-fly", "seated-cable-row"];
const shouldersArms = ["overhead-press", "lateral-raise", "reverse-pec-deck", "barbell-curl", "close-grip-bench-press", "tricep-pushdown"];

function prescriptions(ids, variant, baseSets = 3) {
    const repSchemes = ["5-8", "6-10", "8-10", "8-12", "10-12", "10-15", "12-15", "8-15", "12-20", "6-12", "10-20"];
    return rotate(ids, variant % ids.length).map((id, index) => ex(
        id,
        index < 2 ? baseSets + 1 : baseSets,
        repSchemes[(variant + index) % repSchemes.length]
    ));
}

function buildDays(profile, variant) {
    if (profile.structure === "ppl") {
        const cycle = [
            day("Day 1 - Push", prescriptions(push, variant)),
            day("Day 2 - Pull", prescriptions(pull, variant + 1)),
            day("Day 3 - Legs", prescriptions(legs, variant + 2)),
            day("Day 4 - Upper Detail", prescriptions(upper, variant + 3)),
            day("Day 5 - Lower and Core", prescriptions(lower, variant + 4))
        ];
        return cycle.slice(0, profile.days);
    }
    if (profile.structure === "classic") {
        const cycle = [
            day("Day 1 - Chest and Back", prescriptions(chestBack, variant, 3)),
            day("Day 2 - Legs", prescriptions(legs, variant + 1, 3)),
            day("Day 3 - Shoulders and Arms", prescriptions(shouldersArms, variant + 2, 3)),
            day("Day 4 - Back and Chest Detail", prescriptions([...pull.slice(0, 4), "pec-deck", "cable-lat-pullover"], variant + 3, 3)),
            day("Day 5 - Legs and Arms", prescriptions([...lower.slice(0, 4), "dumbbell-curl", "overhead-tricep-extension"], variant + 4, 3))
        ];
        return cycle.slice(0, profile.days);
    }
    const cycle = [
        day("Day 1 - Athletic Full Body", prescriptions(athletic, variant, 3)),
        day("Day 2 - Upper Body", prescriptions(upper, variant + 1, 3)),
        day("Day 3 - Lower Body", prescriptions(lower, variant + 2, 3)),
        day("Day 4 - Strength and Definition", prescriptions([...chestBack.slice(0, 3), ...shouldersArms.slice(0, 3)], variant + 3, 3)),
        day("Day 5 - Total-Body Conditioning", prescriptions([...athletic.slice(2), "push-up", "pull-up"], variant + 4, 2))
    ];
    return cycle.slice(0, profile.days);
}

const profiles = [
    ["fight-club-lean-definition", "Underground Fighter Definition", 4, "athletic", "Brad Pitt's Fight Club physique", "Movie Inspired", "https://www.gq-magazine.co.uk/fitness/article/brad-pitt-fight-club-workout"],
    ["bronze-age-warrior-mass", "Bronze Age Warrior Mass", 5, "classic", "Brad Pitt's Troy transformation", "Movie Inspired", "https://superherojacked.com/2017/02/06/brad-pitt-workout/"],
    ["philadelphia-boxer-conditioning", "Philadelphia Boxer Conditioning", 5, "athletic", "Sylvester Stallone's Rocky training style", "Movie Inspired", "https://www.muscleandstrength.com/workouts/sylvester-stallone-workout"],
    ["jungle-veteran-strength", "Jungle Veteran Strength", 4, "classic", "Sylvester Stallone's Rambo-era physique", "Movie Inspired", "https://www.muscleandstrength.com/workouts/sylvester-stallone-workout"],
    ["metropolis-hero-mass", "Metropolis Hero Mass", 5, "ppl", "Henry Cavill's Superman physique", "Movie Inspired", "https://www.muscleandstrength.com/workouts/henry-cavill-workout"],
    ["monster-slayer-athletic", "Monster Slayer Athletic", 4, "athletic", "Henry Cavill's Witcher preparation", "Movie Inspired", "https://www.menshealth.com/fitness/a30334616/henry-cavill-witcher-workout/"],
    ["first-avenger-build", "First Avenger Build", 5, "ppl", "Chris Evans' Captain America transformation", "Movie Inspired", "https://www.muscleandstrength.com/workouts/chris-evans-workout"],
    ["mercenary-hero-muscle", "Mercenary Hero Muscle", 4, "ppl", "Ryan Reynolds' Deadpool physique", "Movie Inspired", "https://www.muscleandstrength.com/workouts/ryan-reynolds-deadpool-inspired-workout"],
    ["galactic-titan-mass", "Galactic Titan Mass", 5, "classic", "Dave Bautista's Drax physique", "Movie Inspired", "https://www.muscleandstrength.com/workouts/dave-bautista-workout"],
    ["star-lord-athletic-muscle", "Star-Lord Athletic Muscle", 4, "athletic", "Chris Pratt's Guardians transformation", "Movie Inspired", "https://www.muscleandstrength.com/workouts/chris-pratt-workout-program"],
    ["road-house-fighter", "Road House Fighter", 5, "athletic", "Jake Gyllenhaal's Road House training", "Trainer Documented", "https://www.menshealth.com/fitness/a60175455/jake-gyllenhaal-workout-road-house/"],
    ["southpaw-boxing-strength", "Southpaw Boxing Strength", 5, "athletic", "Jake Gyllenhaal's Southpaw transformation", "Movie Inspired", "https://www.mensjournal.com/health-fitness/jake-gyllenhaals-southpaw-workout"],
    ["mma-warrior-build", "MMA Warrior Build", 5, "athletic", "Tom Hardy's Warrior physique", "Movie Inspired", "https://www.menshealth.com/uk/building-muscle/a755820/tom-hardy-warrior-workout/"],
    ["masked-villain-strength", "Masked Villain Strength", 4, "classic", "Tom Hardy's Bane physique", "Movie Inspired", "https://www.menshealth.com/uk/building-muscle/a748430/tom-hardy-bane-workout/"],
    ["secret-agent-athletic", "Secret Agent Athletic", 4, "athletic", "Daniel Craig's James Bond conditioning", "Movie Inspired", "https://www.menshealth.com/uk/building-muscle/a37854875/daniel-craig-workout/"],
    ["reacher-power-build", "Military Investigator Power", 5, "ppl", "Alan Ritchson's Reacher physique", "Celebrity Inspired", "https://www.menshealth.com/fitness/a38667785/alan-ritchson-reacher-workout/"],
    ["jungle-lord-athletic", "Jungle Lord Athletic", 5, "athletic", "Alexander Skarsgard's Tarzan transformation", "Movie Inspired", "https://www.menshealth.com/fitness/a19541486/alexander-skarsgard-tarzan-workout/"],
    ["cosmic-king-muscle", "Cosmic King Muscle", 4, "ppl", "Kumail Nanjiani's Eternals transformation", "Movie Inspired", "https://www.menshealth.com/fitness/a30146461/kumail-nanjiani-workout/"],
    ["martial-arts-hero-strength", "Martial-Arts Hero Strength", 4, "athletic", "Simu Liu's Shang-Chi preparation", "Movie Inspired", "https://www.menshealth.com/fitness/a37431937/simu-liu-shang-chi-workout/"],
    ["beast-back-specialization", "Beast Back Specialization", 4, "ppl", "James McAvoy's Glass back training", "Trainer Documented", "https://www.menshealth.com/fitness/a27113748/james-mcavoy-beast-workout/"],
    ["cosmic-captain-strength", "Cosmic Captain Strength", 4, "athletic", "Brie Larson's Captain Marvel preparation", "Celebrity Inspired", "https://www.menshealth.com/fitness/a35730977/brie-larson-workout/"],
    ["amazon-warrior-conditioning", "Amazon Warrior Conditioning", 4, "athletic", "Gal Gadot's Wonder Woman preparation", "Movie Inspired", "https://www.muscleandfitness.com/workouts/workout-routines/gal-gadots-wonder-woman-workout/"],
    ["mighty-heroine-strength", "Mighty Heroine Strength", 4, "ppl", "Natalie Portman's Thor transformation", "Movie Inspired", "https://www.womenshealthmag.com/fitness/a40552927/natalie-portman-thor-workout/"],
    ["widow-combat-athletic", "Widow Combat Athletic", 4, "athletic", "Florence Pugh's Black Widow preparation", "Movie Inspired", "https://www.womenshealthmag.com/uk/fitness/a37002376/florence-pugh-workout/"],
    ["assassin-strength-conditioning", "Assassin Strength and Conditioning", 4, "athletic", "Halle Berry's John Wick preparation", "Celebrity Inspired", "https://www.menshealth.com/fitness/a28654515/halle-berry-john-wick-workout/"],
    ["vampire-hunter-athletic", "Vampire Hunter Athletic", 4, "athletic", "Jessica Biel's Blade: Trinity physique", "Movie Inspired", "https://www.muscleandfitness.com/athletes-celebrities/girls/jessica-biel-workout/"],
    ["comic-vigilante-strength", "Comic Vigilante Strength", 4, "ppl", "Jennifer Garner's Elektra preparation", "Movie Inspired", "https://www.womenshealthmag.com/fitness/a60032535/jennifer-garner-elektra-workout/"],
    ["wakandan-queen-strength", "Wakandan Queen Strength", 4, "athletic", "Angela Bassett's Black Panther conditioning", "Celebrity Inspired", "https://www.menshealth.com/fitness/a42760388/angela-bassett-workout/"],
    ["boxing-corner-athletic", "Boxing Corner Athletic", 4, "athletic", "Tessa Thompson's Creed training", "Movie Inspired", "https://www.menshealth.com/fitness/a19536009/tessa-thompson-creed-workout/"],
    ["galactic-warrior-conditioning", "Galactic Warrior Conditioning", 4, "athletic", "Daisy Ridley's Star Wars preparation", "Movie Inspired", "https://www.elle.com/uk/beauty/body-and-physical-health/a26826/daisy-ridley-workout/"],
    ["four-time-olympia-volume", "Four-Time Olympia Volume", 5, "classic", "Jay Cutler's high-volume bodybuilding style", "Bodybuilder Inspired", "https://www.muscleandstrength.com/articles/jay-cutler-workout-routine"],
    ["seven-time-physique-detail", "Seven-Time Physique Detail", 5, "ppl", "Phil Heath's detail-focused training", "Bodybuilder Inspired", "https://www.muscleandfitness.com/athletes-celebrities/pro-tips/phil-heaths-mr-olympia-training-routine/"],
    ["eight-time-symmetry-split", "Eight-Time Symmetry Split", 5, "classic", "Lee Haney's stimulate-don't-annihilate approach", "Bodybuilder Inspired", "https://www.muscleandfitness.com/flexonline/training/lee-haney-workout/"],
    ["aesthetic-golden-proportions", "Aesthetic Golden Proportions", 4, "classic", "Frank Zane's symmetry-focused training", "Bodybuilder Inspired", "https://www.muscleandfitness.com/flexonline/training/frank-zanes-workout-routine/"],
    ["myth-era-mass", "Myth Era Mass", 5, "classic", "Sergio Oliva's classic mass-building style", "Bodybuilder Inspired", "https://www.muscleandfitness.com/flexonline/training/sergio-oliva-workout/"],
    ["heavy-duty-rotation", "Heavy Duty Rotation", 3, "classic", "Mike Mentzer's Heavy Duty principles", "Documented Method", "https://www.muscleandstrength.com/workouts/mike-mentzer-heavy-duty-workout"],
    ["quad-legend-specialization", "Quad Legend Specialization", 4, "classic", "Tom Platz's leg-training style", "Bodybuilder Inspired", "https://www.muscleandfitness.com/flexonline/training/tom-platz-leg-workout/"],
    ["hulking-classic-mass", "Hulking Classic Mass", 5, "classic", "Lou Ferrigno's bodybuilding style", "Bodybuilder Inspired", "https://www.muscleandfitness.com/flexonline/training/lou-ferrigno-workout/"],
    ["sardinian-power-physique", "Sardinian Power Physique", 4, "classic", "Franco Columbu's power-bodybuilding approach", "Bodybuilder Inspired", "https://www.muscleandfitness.com/flexonline/training/franco-columbu-workout/"],
    ["silver-era-powerbuilding", "Silver Era Powerbuilding", 3, "classic", "Reg Park's foundational strength style", "Bodybuilder Inspired", "https://www.muscleandstrength.com/workouts/reg-park-5x5-workout"],
    ["blade-consistency-split", "Blade Consistency Split", 5, "ppl", "Dexter Jackson's longevity-focused bodybuilding", "Bodybuilder Inspired", "https://www.muscleandfitness.com/flexonline/training/dexter-jackson-workout/"],
    ["predator-back-detail", "Predator Back Detail", 5, "ppl", "Kai Greene's back and physique training style", "Bodybuilder Inspired", "https://www.muscleandfitness.com/flexonline/training/kai-greene-back-workout/"],
    ["sultan-symmetry-split", "Sultan of Symmetry Split", 5, "classic", "Flex Wheeler's symmetry-focused training", "Bodybuilder Inspired", "https://www.muscleandfitness.com/flexonline/training/flex-wheeler-workout/"],
    ["classic-stage-detail", "Classic Stage Detail", 5, "classic", "Shawn Ray's balanced competition physique", "Bodybuilder Inspired", "https://www.muscleandfitness.com/flexonline/training/shawn-ray-workout/"],
    ["fullness-and-density", "Fullness and Density", 5, "ppl", "Kevin Levrone's power-building style", "Bodybuilder Inspired", "https://www.muscleandfitness.com/flexonline/training/kevin-levrone-workout/"],
    ["dragon-slayer-arms", "Dragon Slayer Arms", 4, "classic", "Lee Priest's arm-focused training style", "Bodybuilder Inspired", "https://www.muscleandfitness.com/flexonline/training/lee-priest-arm-workout/"],
    ["grainy-hardness-split", "Grainy Hardness Split", 5, "classic", "Branch Warren's high-effort bodybuilding style", "Bodybuilder Inspired", "https://www.muscleandfitness.com/flexonline/training/branch-warren-workout/"],
    ["king-snake-mass", "King Snake Mass", 5, "ppl", "Steve Kuclo's mass-building training", "Bodybuilder Inspired", "https://www.muscleandstrength.com/workouts/steve-kuclo-inspired-workout"],
    ["mountain-dog-hypertrophy", "Mountain Dog Hypertrophy", 5, "ppl", "John Meadows' Mountain Dog principles", "Documented Method", "https://www.muscleandstrength.com/workouts/mountain-dog-ppl-workout"],
    ["physical-culture-foundation", "Physical Culture Foundation", 3, "classic", "Eugen Sandow's early physical-culture methods", "Bodybuilder Inspired", "https://www.muscleandstrength.com/workouts/eugen-sandow-workout"],
];

export const celebrityExpansionPlans = profiles.map((profile, index) => {
    const [id, name, days, structure, inspiration, sourceLabel, sourceUrl] = profile;
    return {
        id,
        name,
        daysPerWeek: days,
        estimatedMinutes: days >= 5 ? "55-70" : "45-60",
        level: structure === "athletic" ? "Intermediate" : "Intermediate / Advanced",
        trainingType: structure === "athletic" ? "Hybrid" : "Hypertrophy",
        catalogueCategory: index < 30 ? "movie" : "bodybuilding",
        sourceLabel,
        sourceUrl,
        description: `A sustainable Level Up adaptation inspired by ${inspiration}. It is not presented as the person's exact private program.`,
        days: buildDays({ days, structure }, index)
    };
});
