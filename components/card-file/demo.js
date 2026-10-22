const LIVE = 'https://aqualang89.github.io/shipnotes-components/';
const ITEMS = [
  { id: 'graph', art: 'noct', image: 'demo-images/graph-view.jpg', number: '04', title: 'Graph View', kind: 'NOTE GRAPH', status: 'JS / OPEN SOURCE', description: 'Your notes as an Obsidian-style graph. Drag one and the whole web follows.', href: LIVE + 'components/graph-view/demo.html' },
  { id: 'garden', art: 'garden', image: 'demo-images/secret-garden.jpg', number: '03', title: 'Garden', kind: 'TYPING WORLD', status: 'CANVAS / OPEN SOURCE', description: 'Type on dark glass and a winter garden grows around your words.', href: LIVE + 'components/secret-garden/demo.html' },
  { id: 'dust', art: 'dust', image: 'demo-images/dust-orb.webp', number: '02', title: 'Dust', kind: 'PARTICLE ORB', status: 'WEBGL / OPEN SOURCE', description: 'A cloud of moving dust with light inside. It reaches toward your cursor.', href: LIVE + 'components/dust-orb/v2/' },
  { id: 'iris', art: 'iris', image: 'demo-images/iris.jpg', number: '01', title: 'Iris', kind: 'VOICE ORB', status: 'WEBGL / OPEN SOURCE', description: 'A living light orb for a voice assistant. It listens, thinks and speaks.', href: LIVE + 'components/iris/demo.html' },
  { id: 'signal', art: 'signal', image: 'demo-images/signal-orb.jpg', number: '05', title: 'Signal', kind: 'AI STATE ORB', status: 'CANVAS / OPEN SOURCE', description: 'Shows what your AI is doing: listening, searching, answering.', href: LIVE + 'components/signal-orb/demo.html' },
  { id: 'contact', art: 'contact', image: 'demo-images/contact-lab.jpg', number: '06', title: 'Contact', kind: 'UI COMPONENT', status: 'WEB / OPEN SOURCE', description: 'A contact form with four themes and a reveal you want to press twice.', href: LIVE + 'components/contact-lab/demo.html' },
  { id: 'fold', art: 'fold', image: 'demo-images/fold.jpg', number: '07', title: 'Fold', kind: 'MOTION STUDY', status: 'WEB / OPEN SOURCE', description: 'A folded surface that answers every move.', href: LIVE + 'motion/fold/' }
];

// ?art=images shows the screenshots, ?art=generated drops all pictures
const params = new URLSearchParams(location.search);
const mode = params.get('art');
const items = ITEMS.map(({ image, art, ...rest }) => mode === 'images' ? { ...rest, image } : mode === 'generated' ? rest : { ...rest, art });
const theme = CardFile.THEMES[params.get('theme')] ? params.get('theme') : 'ember';

window.cardFile = CardFile.mount(document.querySelector('#card-file'), { items, theme, startIndex: 3 });
window.__ready = false;
(cardFile.artRenderer?.ready || Promise.resolve()).then(() => { window.__ready = true; });
