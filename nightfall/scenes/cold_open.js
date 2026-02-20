/**
 * SCENE: COLD OPEN
 * Rain-soaked alley. 2:47 AM. A body. A detective. The usual.
 *
 * HOW TO AUTHOR SCENES:
 *
 * Each scene exports a config object with these sections:
 *
 *   environment  - fog, rain, ambient light, mood
 *   props        - world objects (buildings, cars, lights, signs)
 *   characters   - NPCs and the player character
 *   interactables - things the player can examine (with camera/dialogue sequences)
 *   beats        - the story sequence (narration, dialogue, camera moves, free roam, choices)
 *
 * Beat types:
 *   narration     - { type: 'narration', text: '...' }
 *   dialogue      - { type: 'dialogue', exchange: [...], branches: {...} }
 *   camera        - { type: 'camera', move: 'crane_down|close_up|dolly|orbit|return|dramatic_reveal', ... }
 *   free_roam     - { type: 'free_roam', hint: '...', requiredClues: ['id1','id2'] }
 *   trigger       - { type: 'trigger', condition: 'clues_found', clues: [...], then: [...] }
 *   reveal/hide   - { type: 'reveal', character: 'id' }
 *   wait          - { type: 'wait', duration: 2 }
 *   enable_player - { type: 'enable_player' }
 *   scene_end     - { type: 'scene_end', next: 'scene_filename', transition: 'fade_black' }
 *   choice        - inside dialogue exchange: { type: 'choice', options: [{text, tone, next}] }
 *
 * Camera moves:
 *   crane_down     - from/to/lookAt/duration
 *   close_up       - target/duration
 *   dolly          - from/to/lookAt/duration
 *   orbit          - center/radius/height/startAngle/endAngle/duration
 *   dramatic_reveal - target/duration
 *   return         - returns to saved position
 *   pan/tracking   - from/to/lookAt/duration
 */

export default {
    id: 'cold_open',
    title: 'Cold Open',
    subtitle: 'Downtown — 2:47 AM',

    environment: {
        fog: { color: '#060610', density: 0.04 },
        rain: { intensity: 0.8 },
        ambient: { color: '#0e0e20', intensity: 0.35 },
    },

    playerBounds: { minX: -8, maxX: 8, minZ: -6, maxZ: 10 },

    props: [
        { type: 'building', position: [-7, 0, -8], scale: [6, 14, 8] },
        { type: 'building', position: [7, 0, -8], scale: [5, 11, 8] },
        { type: 'building', position: [-10, 0, -4], scale: [3, 16, 10] },
        { type: 'building', position: [10, 0, -4], scale: [3, 12, 10] },

        { type: 'wall', position: [-9, 0, 3], scale: [2, 5, 12], rotation: [0, 0, 0] },
        { type: 'wall', position: [9, 0, 3], scale: [2, 5, 12], rotation: [0, 0, 0] },

        { type: 'streetlight', position: [-3, 0, 4], color: '#ffaa44' },
        { type: 'streetlight', position: [4, 0, -2], color: '#ff9933' },

        { type: 'neon_sign', position: [-7, 5.5, -3.9], text: 'BAR', color: '#ff0040' },
        { type: 'neon_sign', position: [7, 6, -3.9], text: 'HOTEL', color: '#00ccff' },

        { type: 'dumpster', position: [-4, 0, 1], rotation: [0, 0.3, 0] },
        { type: 'car', position: [5, 0, 6], rotation: [0, -0.4, 0], color: 0x0a0a18 },
        { type: 'car', position: [-6, 0, 8], rotation: [0, 0.15, 0], color: 0x18100a },
        { type: 'barrel', position: [3, 0, -3] },
        { type: 'crate', position: [3.8, 0, -2.5] },
        { type: 'crate', position: [3.3, 0, -3.5] },
        { type: 'fire_escape', position: [-7, 0, -3.5] },
        { type: 'phone_booth', position: [6, 0, 2] },
    ],

    characters: [
        {
            id: 'player',
            position: [0, 0, 9],
            facing: [0, 0, -1],
            appearance: {
                coat: '#1a1a28',
                hat: true,
                longCoat: true,
                cigarette: true,
            },
        },
        {
            id: 'victim',
            position: [1, 0, -2],
            state: 'dead',
            appearance: {
                coat: '#2a2a35',
                shirt: '#e0d8c8',
                hat: false,
                longCoat: false,
            },
        },
        {
            id: 'witness',
            position: [-5.5, 0, -1],
            hidden: true,
            facing: [1, 0, 0],
            appearance: {
                coat: '#3a3a3a',
                hat: false,
                longCoat: true,
                cigarette: false,
            },
        },
    ],

    interactables: [
        {
            id: 'body',
            position: [1, 0.5, -2],
            radius: 2.0,
            prompt: 'Examine body',
            onExamine: [
                { type: 'camera', move: 'close_up', target: [1, 0.8, -2], duration: 1.5 },
                { type: 'narration', text: "Male, mid-forties. The kind of face you'd find behind a desk, not in front of a dumpster." },
                { type: 'narration', text: "Still warm. No wallet. No phone. But the shoes — Italian leather, hand-stitched. Nobody mugs a man and leaves the shoes." },
                { type: 'clue', id: 'expensive_shoes', name: 'Italian Shoes', description: 'Victim wearing expensive shoes. Valuables missing, but the shoes remain.' },
                { type: 'camera', move: 'return', duration: 1.2 },
            ],
        },
        {
            id: 'dumpster_search',
            position: [-4, 0.8, 1],
            radius: 1.8,
            prompt: 'Search dumpster',
            onExamine: [
                { type: 'camera', move: 'close_up', target: [-4, 1.2, 1], duration: 1.2 },
                { type: 'narration', text: "The usual filth. Fast food wrappers, broken glass, someone's regrets." },
                { type: 'narration', text: "And a matchbook. Gold embossed: 'The Velvet Room'. High-end place for a neighborhood like this." },
                { type: 'clue', id: 'matchbook', name: 'Matchbook — The Velvet Room', description: 'Gold-embossed matchbook from an upscale nightclub.' },
                { type: 'camera', move: 'return', duration: 1 },
            ],
        },
        {
            id: 'car_inspection',
            position: [5, 0.5, 6],
            radius: 2.0,
            prompt: 'Inspect vehicle',
            onExamine: [
                { type: 'camera', move: 'close_up', target: [5, 1, 6], duration: 1.2 },
                { type: 'narration', text: "Sedan. Dark. Recent model. No plates — they've been removed. Deliberately." },
                { type: 'narration', text: "Rental sticker on the windshield. Peeled off in a hurry, but you can still see the adhesive outline. Enterprise. Airport location." },
                { type: 'clue', id: 'rental_car', name: 'Rental Sticker Residue', description: 'Car had rental sticker hastily removed. Airport Enterprise location.' },
                { type: 'camera', move: 'return', duration: 1 },
            ],
        },
    ],

    beats: [
        {
            type: 'camera',
            move: 'crane_down',
            from: [0, 22, 2],
            to: [2, 4, 12],
            lookAt: [0, 0, 0],
            duration: 5,
        },

        {
            type: 'narration',
            text: "Rain. The city's oldest alibi.",
        },

        {
            type: 'narration',
            text: "The call came in at 2:30. Anonymous tip — they're always anonymous. Like the city itself picked up the phone.",
        },

        {
            type: 'camera',
            move: 'dolly',
            from: [2, 4, 12],
            to: [0, 2.5, 8],
            lookAt: [0, 1, 0],
            duration: 3,
        },

        {
            type: 'narration',
            text: "Downtown alley. The kind of place where streetlights go to die and bad decisions come to collect.",
        },

        { type: 'enable_player' },

        {
            type: 'free_roam',
            hint: "Look around. See what the rain hasn't washed away yet.",
            requiredClues: ['expensive_shoes', 'matchbook'],
        },

        {
            type: 'trigger',
            condition: 'clues_found',
            clues: ['expensive_shoes', 'matchbook'],
            then: [
                { type: 'wait', duration: 0.5 },
                { type: 'reveal', character: 'witness' },
                { type: 'camera', move: 'dramatic_reveal', target: [-5.5, 1.5, -1], duration: 2.5 },
                { type: 'narration', text: "Movement. Behind the fire escape. Someone's been watching this whole time." },
            ],
        },

        {
            type: 'dialogue',
            exchange: [
                { speaker: 'YOU', text: "Don't move." },
                { speaker: 'WITNESS', text: "I didn't do nothing! I was just — I live here, man. This is my alley." },
                { speaker: 'YOU', text: "Your alley's got a dead man in it. That changes the rental terms." },
                { speaker: 'WITNESS', text: "I know. I know. Look, I saw what happened, okay? I just... I don't want trouble." },
                {
                    type: 'choice',
                    options: [
                        {
                            text: '"Tell me what you saw. Calmly."',
                            tone: 'calm',
                            next: 'witness_cooperates',
                        },
                        {
                            text: '"Start talking. Before I start assuming."',
                            tone: 'pressure',
                            next: 'witness_pressured',
                        },
                    ],
                },
            ],
            branches: {
                witness_cooperates: [
                    { speaker: 'WITNESS', text: "A car. Black sedan — like that one over there. Two guys pulled him out of the back seat. Business types. Suits." },
                    { speaker: 'WITNESS', text: "One of 'em dropped something. A card, maybe. Picked it up fast. They drove off toward the waterfront." },
                    { speaker: 'YOU', text: "Did you see their faces?" },
                    { speaker: 'WITNESS', text: "One of 'em, yeah. Big guy. Scar on his jaw. The other one... stayed in the shadows. Like he was used to it." },
                    { type: 'clue', id: 'witness_account', name: 'Witness Account — Cooperative', description: 'Two men in suits, black sedan, headed to waterfront. One with a jaw scar.' },
                    { type: 'narration', text: "The waterfront. Where all the city's sins wash up eventually." },
                ],
                witness_pressured: [
                    { speaker: 'WITNESS', text: "Alright, alright! A car. Black. Two of 'em dragged that guy out. Suits, real fancy. They went... toward the docks maybe? I don't know." },
                    { speaker: 'WITNESS', text: "Look, that's all I got. I was trying not to be seen. You know how it is." },
                    { speaker: 'YOU', text: "I know exactly how it is." },
                    { type: 'clue', id: 'witness_account', name: 'Witness Account — Under Pressure', description: 'Two suited men, black sedan, possibly headed to docks. Witness was evasive.' },
                    { type: 'narration', text: "Half a story. Better than none. The docks it is." },
                ],
            },
        },

        {
            type: 'camera',
            move: 'crane_down',
            from: [0, 2.5, 7],
            to: [0, 8, 2],
            lookAt: [0, 0, -5],
            duration: 3,
        },

        {
            type: 'narration',
            text: "Two men. A dead body. The Velvet Room. Italian shoes and a rental car with no plates.",
        },

        {
            type: 'narration',
            text: "Somebody went through a lot of trouble to make this look like nothing. Which means it's everything.",
        },

        {
            type: 'scene_end',
            next: 'act_one',
            transition: 'fade_black',
        },
    ],
};
