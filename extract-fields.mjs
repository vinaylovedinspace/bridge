import { PDFDocument } from 'pdf-lib';
import { readFile } from 'fs/promises';

const fileName = process.argv[2];

if (!fileName) {
  console.error('Usage: node extract-fields.mjs <pdf-filename>');
  process.exit(1);
}

const pdfBytes = await readFile(`./public/${fileName}`);
const pdfDoc = await PDFDocument.load(pdfBytes);
const form = pdfDoc.getForm();

const fields = form.getFields();

console.log(`\n=== Fields in ${fileName} ===\n`);
console.log(`Total fields: ${fields.length}\n`);

const fieldNames = {};

fields.forEach((field) => {
  const name = field.getName();
  const type = field.constructor.name;
  fieldNames[name] = name;
  console.log(`${name}: '${name}', // ${type}`);
});

console.log('\n=== TypeScript object ===\n');
console.log('export const fieldNames = {');
fields.forEach((field, index) => {
  const name = field.getName();
  const type = field.constructor.name;
  const comma = index < fields.length - 1 ? ',' : '';
  console.log(`  ${name}: '${name}'${comma} // ${type}`);
});
console.log('};');
