# Mopiq flashcard examples

Open `index.html` in a browser. Choose **Flip** or **Flat** above the cards. Flat shows the question and answer on one card, separated by a line. Open `index.html?layout=flat` to start in Flat. The gallery contains 32 cards. Choose **Other subjects** for maths, chemistry, history, geography, and biology. Cards are white and have uniform dimensions within each layout.

## Reuse a card

1. Load `flashcards.css` and `flashcards.js` once. Use `defer` when including the script in the document head.
2. Copy any complete `<article class="mfx-card">` block from `index.html`. The front and back work without the gallery wrapper. If you edit the question, update the article’s `data-label` for the flip button’s accessible name.
3. Add `data-layout="flat"` to the copied article to show both sides at once. With JavaScript disabled, the card also uses the flat layout.
4. To use a single static side, keep only the corresponding `.mfx-face--front` or `.mfx-face--back` inside the article’s `.mfx-faces` container and remove the footer and live announcement.

The pronunciation and expanded audio players are static mockups of the in-card Mopiq controls. Each prompt can be answered from the text.

The formulas use native MathML. They travel with the card and use the shared stylesheet.

## Images to source

| Card | Side | Suggested image |
| --- | --- | --- |
| 02 · Mitral valve | Front | Left heart chambers with the valve unlabeled |
| 05 · Alveoli | Back | An alveolus and its surrounding capillaries |
| 09 · Mitochondria | Back | A mitochondrion showing the inner membrane and cristae |
| 11 · Nephron | Back | A nephron with its glomerulus and tubule labeled |
| 16 · Latitude | Front | A globe showing the equator and a parallel north of it |
| 19 · Pythagorean theorem | Front | A right triangle with legs labeled 6 and 8 and the hypotenuse unlabeled |
| 25 · Bastille | Back | Period engraving of the storming of the Bastille |
| 26 · Strait of Gibraltar | Back | Map showing southern Spain, northern Morocco, and the strait |
| 31 · Gutenberg Bible | Back | A digitized page of the Gutenberg Bible |
| 32 · Andes | Back | Relief map of South America highlighting the Andes |

Replace the matching placeholder `div` with `<img class="mfx-image-slot" src="…" alt="…">`. The slot keeps its size. The prompts already contain enough information to answer without the diagrams.

## References

- [Mopiq on the App Store](https://apps.apple.com/us/app/mopiq-ai-flashcards-learning/id6443485322)
- [NHLBI: Blood flow through the heart](https://www.nhlbi.nih.gov/health/heart/blood-flow) and [how the heart beats](https://www.nhlbi.nih.gov/health/heart/heart-beats)
- [NHLBI: Gas exchange in the lungs](https://www.nhlbi.nih.gov/health/lungs/respiratory-system)
- [NIDDK: How kidneys work](https://www.niddk.nih.gov/health-information/kidney-disease/kidneys-how-they-work) and [insulin release](https://www.niddk.nih.gov/news/archive/2023/how-eating-fasting-regulate-insulin)
- [NHLBI: Blood tests](https://www.nhlbi.nih.gov/health/blood-tests) and [how blood clots](https://www.nhlbi.nih.gov/health/clotting-disorders/how-blood-clots)
- [Élysée: The storming of the Bastille](https://www.elysee.fr/en/french-presidency/bastille-day-14-july) and [Library of Congress: The Gutenberg Bible](https://guides.loc.gov/gutenberg)
- [NASA: Water exchange through the Strait of Gibraltar](https://oceancolor.gsfc.nasa.gov/outreach/ocsciencefocus/BadBloomRising.pdf) and [the Andes in South America](https://earthobservatory.nasa.gov/IOTD/view.php?id=1152)
