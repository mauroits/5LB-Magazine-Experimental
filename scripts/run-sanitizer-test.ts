import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
(global as any).window = dom.window;
(global as any).document = dom.window.document;
(global as any).Node = dom.window.Node;
(global as any).Element = dom.window.Element;
(global as any).DOMParser = dom.window.DOMParser;

async function run() {
  const { sanitizeArticleHtml } = await import('../src/utils/sanitizeHtml');

  const testCases = [
    {
      id: 1,
      input: '<img src=x onerror="alert(1)">',
      expectedDesc: 'niente onerror',
      check: (out: string) => !out.includes('onerror') && out.includes('<img'),
    },
    {
      id: 2,
      input: '<script>alert(1)</script>',
      expectedDesc: 'niente script',
      check: (out: string) => !out.includes('<script') && !out.includes('alert(1)'),
    },
    {
      id: 3,
      input: '<a href="javascript:alert(1)">clic</a>',
      expectedDesc: 'niente href javascript:',
      check: (out: string) => !out.includes('javascript:'),
    },
    {
      id: 4,
      input: '<iframe src="https://youtube.com.example.com/embed/x"></iframe>',
      expectedDesc: 'iframe rimosso',
      check: (out: string) => !out.includes('<iframe'),
    },
    {
      id: 5,
      input: '<iframe src="https://www.youtube.com/embed/abc"></iframe>',
      expectedDesc: 'iframe PRESENTE',
      check: (out: string) => out.includes('<iframe') && out.includes('https://www.youtube.com/embed/abc'),
    },
    {
      id: 6,
      input: '<iframe src="https://www.youtube.com/embed/abc" srcdoc="<script>alert(1)</script>"></iframe>',
      expectedDesc: 'nessun srcdoc',
      check: (out: string) => !out.includes('srcdoc'),
    },
    {
      id: 7,
      input: '<iframe src="//www.youtube.com/embed/abc"></iframe>',
      expectedDesc: 'iframe PRESENTE',
      check: (out: string) => out.includes('<iframe') && out.includes('//www.youtube.com/embed/abc'),
    },
    {
      id: 8,
      input: '<iframe src="http://www.youtube.com/embed/abc"></iframe>',
      expectedDesc: 'iframe rimosso',
      check: (out: string) => !out.includes('<iframe'),
    },
    {
      id: 9,
      input: '<a href="https://example.com">x</a>',
      expectedDesc: 'target="_blank" e rel="noopener noreferrer"',
      check: (out: string) => out.includes('target="_blank"') && out.includes('rel="noopener noreferrer"'),
    },
    {
      id: 10,
      input: '<svg><script>alert(1)</script></svg>',
      expectedDesc: 'niente script',
      check: (out: string) => !out.includes('<script') && !out.includes('alert(1)'),
    },
    {
      id: 11,
      input: '<p style="color:red">testo</p><img src="a.jpg">',
      expectedDesc: 'p e img presenti',
      check: (out: string) => out.includes('<p') && out.includes('testo') && out.includes('<img'),
    },
  ];

  console.log('=== TEST EXECUTION RESULTS ===\n');
  let passCount = 0;
  for (const tc of testCases) {
    const output = sanitizeArticleHtml(tc.input);
    const passed = tc.check(output);
    if (passed) passCount++;
    console.log(`TEST ${tc.id}: ${passed ? 'PASS' : 'FAIL'}`);
    console.log(`  Input:    ${tc.input}`);
    console.log(`  Output:   ${output}`);
    console.log(`  Atteso:   ${tc.expectedDesc}`);
    console.log(`  Stato:    ${passed ? '✓ SUPERATO' : '✗ FALLITO'}\n`);
  }
  console.log(`Totale: ${passCount}/${testCases.length} superati.`);
}

run().catch(console.error);
