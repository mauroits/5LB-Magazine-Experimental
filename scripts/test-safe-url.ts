import { toHttpsUrl, toHttpOrHttpsUrl } from '../src/utils/safeUrl';

const testInputs = [
  "javascript:alert(1)",
  "  JavaScript:alert(1)",
  "data:text/html,x",
  "intent://x#Intent;end;",
  "vbscript:x",
  "//example.com/a",
  "http://example.com",
  "https://example.com",
  "/percorso/relativo",
  "",
];

console.log('========================================================================');
console.log('TEST RISULTATI: toHttpsUrl e toHttpOrHttpsUrl');
console.log('========================================================================\n');

for (const input of testInputs) {
  const displayInput = JSON.stringify(input);
  const outHttps = toHttpsUrl(input);
  const outHttpOrHttps = toHttpOrHttpsUrl(input);

  console.log(`INPUT: ${displayInput}`);
  console.log(`  -> toHttpsUrl:         ${outHttps === null ? 'null' : JSON.stringify(outHttps)}`);
  console.log(`  -> toHttpOrHttpsUrl:   ${outHttpOrHttps === null ? 'null' : JSON.stringify(outHttpOrHttps)}\n`);
}
