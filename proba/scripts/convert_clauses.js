/*
 Node script to convert clause HTML files (with <section id="audit-...">...</section>)
 to JSON files like c5.json with properties: id, title, html
 NOTE: This script is a legacy HTML->JSON helper and is generally deprecated.
 The preferred canonical generator is the PDF parser: `scripts/convert_pdf_annexC_to_json.py`.

 Usage (PowerShell):
 node .\scripts\convert_clauses.js
*/

const fs = require('fs');
const path = require('path');

const clausesDir = path.join(__dirname, '..', 'clauses');

if (!fs.existsSync(clausesDir)) {
  console.error('Clauses directory not found:', clausesDir);
  process.exit(1);
}

const files = fs.readdirSync(clausesDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filepath = path.join(clausesDir, file);
  const content = fs.readFileSync(filepath, 'utf8');

  // Find <section id="audit-..." ...>...</section>
  const sectionMatch = content.match(/<section[\s\S]*?>[\s\S]*?<\/section>/im);
  const titleMatch = content.match(/<h2>(.*?)<\/h2>/i);
  const idMatch = content.match(/id=\"(audit-[^\"]+)\"/i);

  const sectionHtml = sectionMatch ? sectionMatch[0] : content;
  const title = titleMatch ? titleMatch[1].trim() : '';
  const id = idMatch ? idMatch[1].trim() : file.replace('.html', '');

  const json = {
    id: id.replace('audit-', ''),
    title: title,
    html: sectionHtml.replace(/"/g, '\\"').replace(/\r\n/g, '\n')
  };

  const outPath = path.join(clausesDir, `${json.id}.json`);
  fs.writeFileSync(outPath, JSON.stringify(json, null, 2), 'utf8');
  console.log('Wygenerowano', outPath);
});

console.log('Konwersja zakończona.');
