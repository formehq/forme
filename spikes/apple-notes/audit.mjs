import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";

const output = process.argv[2];
if (!output) throw new Error("usage: node audit.mjs OUTPUT_DIRECTORY");

const manifest = JSON.parse(await readFile(join(output, "manifest.json"), "utf8"));
const fixturePrefix = "Forme Fixture";
const fixtures = manifest.notes.filter((note) => note.title.startsWith(fixturePrefix));
const aggregate = {
  htmlLinks: 0,
  bareUrls: 0,
  tables: 0,
  embeddedImages: 0,
  objectNotes: 0,
  failedAttachmentNotes: 0,
  failedAttachmentNotesWithTables: 0,
  mirrorBytes: 0,
  attachmentBytes: 0,
};

for (const note of manifest.notes) {
  const html = await readFile(join(output, note.rawHtmlPath), "utf8");
  aggregate.htmlLinks += (html.match(/<a\s[^>]*href=/gi) || []).length;
  aggregate.bareUrls += (html.match(/https?:\/\//gi) || []).length;
  aggregate.tables += (html.match(/<table(?:\s|>)/gi) || []).length;
  aggregate.embeddedImages += (html.match(/<img\s[^>]*src=["']data:image\//gi) || []).length;
  if (/<object(?:\s|>)/i.test(html)) aggregate.objectNotes += 1;
  const hasFailedAttachment = note.attachments.some((attachment) => !attachment.saved);
  if (hasFailedAttachment) {
    aggregate.failedAttachmentNotes += 1;
    if (/<table(?:\s|>)/i.test(html)) aggregate.failedAttachmentNotesWithTables += 1;
  }
  if (note.markdownPath) aggregate.mirrorBytes += (await stat(join(output, note.markdownPath))).size;
  for (const attachment of note.attachments) {
    if (attachment.saved && attachment.relativePath) {
      aggregate.attachmentBytes += (await stat(join(output, attachment.relativePath))).size;
    }
  }
}

function fixture(name) {
  return fixtures.find((note) => note.title === name);
}

async function markdown(note) {
  return note?.markdownPath ? readFile(join(output, note.markdownPath), "utf8") : "";
}

const rich = await markdown(fixture("Forme Fixture - Rich Text"));
const table = await markdown(fixture("Forme Fixture - Table"));
const attachments = fixture("Forme Fixture - Attachments");
const attachmentMarkdown = await markdown(attachments);
const bareLink = await markdown(fixture("Forme Fixture - Bare Link"));
const duplicates = fixtures.filter((note) => note.title === "Forme Fixture : Duplicate / Name");

const fidelity = {
  headingText: rich.includes("Heading One"),
  headingLevel: /^#+ Heading One$/m.test(rich),
  bold: /\*\*bold\*\*/.test(rich),
  italic: /_italic_/.test(rich),
  unicode: rich.includes("你好, café, résumé"),
  namedLinkTarget: rich.includes("https://example.com/path?q=forme"),
  bareLinkText: bareLink.includes("https://example.com/path?q=forme"),
  tableCells: ["Name", "Status", "Owner", "Alpha", "Ready", "Beta"]
    .every((value) => table.includes(value)),
  tableAsMarkdown: /^\|.*\|$/m.test(table),
  tableAsHtml: table.includes("<table"),
  fixtureAttachmentsSaved: attachments?.attachments.filter((attachment) => attachment.saved).length || 0,
  fixtureAttachmentLinks: [".png)", ".pdf)", ".txt)"]
    .every((extension) => attachmentMarkdown.includes(extension)),
  embeddedBase64Removed: !attachmentMarkdown.includes("data:image/"),
  duplicatePathsStable: duplicates.length === 2
    && new Set(duplicates.map((note) => note.markdownPath)).size === 2,
};

console.log(JSON.stringify({
  aggregate: manifest.aggregate,
  timings: manifest.timings,
  structure: aggregate,
  fidelity,
}, null, 2));
