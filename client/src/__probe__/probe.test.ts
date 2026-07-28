import { gfm } from 'micromark-extension-gfm';
import { math } from 'micromark-extension-math';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { mathFromMarkdown } from 'mdast-util-math';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { directive } from 'micromark-extension-directive';
import { directiveFromMarkdown } from 'mdast-util-directive';

test('mdast/micromark resolve + execute under fork jest', () => {
  const tree: any = fromMarkdown('# hi\n\n```py\nx=1\n```\n', {
    extensions: [gfm(), directive(), math()],
    mdastExtensions: [gfmFromMarkdown(), directiveFromMarkdown(), mathFromMarkdown()],
  });
  expect(tree.children.length).toBe(2);
  expect(tree.children[0].position.start.offset).toBe(0);
});
