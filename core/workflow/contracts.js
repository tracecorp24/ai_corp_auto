const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..', '..', 'departments');
const DEPARTMENTS = Object.freeze(['research', 'develop', 'analyze']);

function contractFor(department) {
  if (!DEPARTMENTS.includes(department)) throw new Error(`Bilinmeyen departman: ${department}`);
  const filename = path.join(ROOT, `${department.toUpperCase()}.md`);
  const markdown = fs.readFileSync(filename, 'utf8');
  if (markdown.length < 100) throw new Error(`Departman sözleşmesi boş: ${filename}`);
  return { department, filename, markdown, sha256: crypto.createHash('sha256').update(markdown).digest('hex') };
}

module.exports = { contractFor, DEPARTMENTS };
