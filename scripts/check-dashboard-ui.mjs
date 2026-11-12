import { readFile } from "node:fs/promises";
import { fileURLToPath, URL } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const viewFiles = [
  "src/pages/dashboard.astro",
  "src/components/patient/PatientProfile.tsx",
  "src/components/patient/PatientProfileView.tsx",
];
// Same line-based candidate scan as /10x-ui; token definitions and shared UI are intentionally outside its scope.
const literal =
  /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(|-\[[0-9.]+(px|rem)\]|\b(bg|text|border|ring|outline|from|via|to|fill|stroke|shadow|divide)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)\b/;

// Explicit files support disposable positive/negative fixtures without mutating production views.
const files = process.argv.length > 2 ? process.argv.slice(2) : viewFiles;
let matches = 0;
for (const file of files) {
  const source = await readFile(resolve(root, file), "utf8");
  source.split(/\r?\n/).forEach((line, index) => {
    if (!literal.test(line)) return;
    console.error(`${file}:${index + 1}: ${line.trim()}`);
    matches += 1;
  });
}
if (matches) {
  console.error(`Dashboard UI: ${matches} line(s) use literal values; use semantic tokens and shared controls.`);
  process.exitCode = 1;
} else {
  console.log(`Dashboard UI: 0 literal-value lines in ${files.length} file(s).`);
}
