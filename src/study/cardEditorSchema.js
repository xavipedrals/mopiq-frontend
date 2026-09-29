import { Mark, mergeAttributes } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';

export const Cloze = Mark.create({
  name: 'cloze',
  parseHTML() {
    return [{ tag: 'span.anki-cloze' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'anki-cloze' }), 0];
  },
  addCommands() {
    return {
      toggleCloze: () => ({ commands }) => commands.toggleMark(this.name),
    };
  },
});

export const TextSize = Mark.create({
  name: 'textSize',
  inclusive: true,
  addAttributes() {
    return {
      size: {
        default: 'title',
        parseHTML: (element) => {
          const fontSize = String(element.style.fontSize || '').replace(/\s+/g, '').toLowerCase();
          if (fontSize === '1.5em') return 'subtitle';
          if (fontSize === '2em') return 'title';
          return 'title';
        },
        renderHTML: (attributes) => (
          attributes.size === 'subtitle'
            ? { style: 'font-size: 1.5em; font-weight: 600' }
            : { style: 'font-size: 2em; font-weight: 700' }
        ),
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'span',
        getAttrs: (element) => {
          const fontSize = String(element.style.fontSize || '').replace(/\s+/g, '').toLowerCase();
          if (fontSize === '2em') return { size: 'title' };
          if (fontSize === '1.5em') return { size: 'subtitle' };
          return false;
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
  addCommands() {
    return {
      toggleTextSize: (size) => ({ editor, commands }) => (
        editor.isActive(this.name, { size })
          ? commands.unsetMark(this.name)
          : commands.setMark(this.name, { size })
      ),
      unsetTextSize: () => ({ commands }) => commands.unsetMark(this.name),
    };
  },
});

export function cardEditorExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      codeBlock: false,
      horizontalRule: true,
    }),
    Underline,
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    Subscript,
    Superscript,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
    }),
    Image.configure({ allowBase64: false }),
    Cloze,
    TextSize,
  ];
}
