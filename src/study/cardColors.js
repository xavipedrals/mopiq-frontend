const NAMED = {black:'#000000',white:'#ffffff',yellow:'#ffff00',red:'#ff0000',blue:'#0000ff',green:'#008000',lime:'#00ff00',cyan:'#00ffff',aqua:'#00ffff',orange:'#ffa500',pink:'#ffc0cb',gray:'#808080',grey:'#808080',lightgray:'#d3d3d3',lightgrey:'#d3d3d3',lightyellow:'#ffffe0',beige:'#f5f5dc',whitesmoke:'#f5f5f5',transparent:'#00000000'};
export function cssColorChannels(value) {
  let color = String(value || '').trim().toLowerCase();
  color = NAMED[color] || color;
  if (/^#[\da-f]{3,4}$/i.test(color)) color = '#' + [...color.slice(1)].map(c => c+c).join('');
  if (/^#[\da-f]{6}([\da-f]{2})?$/i.test(color)) return [parseInt(color.slice(1,3),16),parseInt(color.slice(3,5),16),parseInt(color.slice(5,7),16),color.length===9 ? parseInt(color.slice(7,9),16)/255 : 1];
  const match = color.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/);
  return match ? [Number(match[1]),Number(match[2]),Number(match[3]),match[4] == null ? 1 : Number(match[4])] : null;
}
export function lightBackdrop(value) {
  const c = cssColorChannels(value);
  return c && c[3] > .5 ? (.299*c[0]+.587*c[1]+.114*c[2]) /255 >= .5 : null;
}
export function readableForeground(value, bright) {
  const c = cssColorChannels(value);
  if (!c) return bright ? '#1e293d' : '#cbd5e1';
  const luminance = (.299*c[0]+.587*c[1]+.114*c[2])/255;
  if (bright) return luminance < .5 ? value : '#1e293d';
  if (luminance >= .5) return value;
  const ratio = (.65-luminance)/(1-luminance);
  return `rgb(${c.slice(0,3).map(v => Math.round(v+(255-v)*ratio)).join(', ')})`;
}

// Parse an inert document; never rewrite text or match parentheses inside HTML.
export function darkCardColors(html) {
  if (typeof DOMParser === 'undefined') return html;
  const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
  const context = doc.createElement('canvas').getContext('2d');
  function normalize(value) { if (!context || !value) return value; context.fillStyle = '#000000'; context.fillStyle = value; return context.fillStyle; }
  function visit(element, inheritedBright = false) {
    let background = element.style?.backgroundColor;
    let foreground = element.style?.color || element.getAttribute('color');
    // Canvas normalizes the full browser CSS color vocabulary, including hsl().
    background = normalize(background);
    const ownBackdrop = lightBackdrop(background);
    const bright = ownBackdrop == null ? inheritedBright : ownBackdrop;
    if (foreground || bright) element.style.color = readableForeground(normalize(foreground), bright);
    for (const child of element.children) visit(child, bright);
  }
  for (const element of doc.body.children) visit(element);
  return doc.body.innerHTML;
}
