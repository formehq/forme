import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import process from "node:process";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

const output = process.argv[2];
if (!output) throw new Error("usage: node convert.mjs OUTPUT_DIRECTORY");

const startedAt = performance.now();
const manifestPath = join(output, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const markdownRoot = join(output, "mirror");
const service = new TurndownService({
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "_",
  headingStyle: "atx",
});
service.use(gfm);
let embeddedImageTargets = [];
let embeddedImageFallback = null;

service.addRule("appleNotesEmbeddedImage", {
  filter: "img",
  replacement(_content, node) {
    const source = node.getAttribute("src") || "";
    const alt = node.getAttribute("alt") || "attachment";
    if (source.startsWith("data:image/")) {
      const target = embeddedImageTargets.shift() || embeddedImageFallback?.(source);
      return target ? `![${alt}](${target})` : "";
    }
    return source ? `![${alt}](${source})` : "";
  },
});

service.addRule("appleNotesObject", {
  filter(node) {
    return node.nodeName === "OBJECT" && node.getElementsByTagName("table").length === 0;
  },
  replacement(_content, node) {
    const source = node.getAttribute("data") || node.getAttribute("src") || "";
    const label = node.getAttribute("title") || node.getAttribute("aria-label") || "attachment";
    return source ? `\n[${label}](${source})\n` : "";
  },
});

function safeSegment(value, fallback) {
  const cleaned = String(value || "")
    .normalize("NFC")
    .replace(/[\x00-\x1f/:]/g, "-")
    .replace(/^\.+$/, "-")
    .trim()
    .slice(0, 80);
  return cleaned || fallback;
}

function attachmentSourceMap(note, markdownPath) {
  const sources = new Map();
  for (const attachment of note.attachments) {
    if (!attachment.saved || !attachment.relativePath) continue;
    const destination = mirrorAttachmentPath(note, attachment);
    const markdownRelative = relative(dirname(markdownPath), destination).replaceAll("\\", "/");
    const target = encodeURI(markdownRelative);
    if (attachment.contentIdentifier) {
      sources.set(attachment.contentIdentifier, target);
      sources.set(`cid:${attachment.contentIdentifier.replace(/^cid:/, "")}`, target);
    }
  }
  return sources;
}

function mirrorAttachmentPath(note, attachment) {
  const suffix = note.rawHtmlPath.split("/")[1];
  return join(markdownRoot, "_attachments", suffix, attachment.name);
}

async function copySavedAttachments(note) {
  for (const attachment of note.attachments) {
    if (!attachment.saved || !attachment.relativePath) continue;
    const source = join(output, attachment.relativePath);
    const destination = mirrorAttachmentPath(note, attachment);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(source, destination);
    attachment.mirrorRelativePath = relative(markdownRoot, destination).replaceAll("\\", "/");
  }
}

function replaceAttachmentSources(html, sourceMap) {
  let converted = html;
  for (const [source, target] of sourceMap) {
    converted = converted.replaceAll(source, target);
  }
  return converted;
}

function unreferencedAttachments(note, markdownPath, markdown) {
  return note.attachments.flatMap((attachment) => {
    if (!attachment.saved || !attachment.relativePath) return [];
    const destination = mirrorAttachmentPath(note, attachment);
    const target = encodeURI(relative(dirname(markdownPath), destination).replaceAll("\\", "/"));
    if (markdown.includes(target)) return [];
    const image = /\.(?:avif|gif|heic|jpe?g|png|webp)$/i.test(attachment.name);
    return [`${image ? "!" : ""}[${attachment.name}](${target})`];
  });
}

function savedImageTargets(note, markdownPath) {
  return note.attachments.flatMap((attachment) => {
    if (!attachment.saved || !attachment.relativePath) return [];
    if (!/\.(?:avif|gif|heic|jpe?g|png|webp)$/i.test(attachment.name)) return [];
    const destination = mirrorAttachmentPath(note, attachment);
    return [encodeURI(relative(dirname(markdownPath), destination).replaceAll("\\", "/"))];
  });
}

function makeEmbeddedImageFallback(note, markdownPath, suffix) {
  let index = 0;
  note.embeddedImages = [];
  return (source) => {
    const match = /^data:image\/([^;,]+);base64,(.+)$/s.exec(source);
    if (!match) return null;
    index += 1;
    const extension = ({ jpeg: "jpg", "svg+xml": "svg" })[match[1]] || match[1].replace(/[^a-z0-9]/gi, "");
    const filename = `embedded-${String(index).padStart(3, "0")}.${extension || "bin"}`;
    const destination = join(markdownRoot, "_attachments", suffix, filename);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, Buffer.from(match[2], "base64"));
    const target = encodeURI(relative(dirname(markdownPath), destination).replaceAll("\\", "/"));
    note.embeddedImages.push({ filename, relativePath: relative(markdownRoot, destination).replaceAll("\\", "/") });
    return target;
  };
}

let markdownCharacters = 0;
let convertedNotes = 0;
let conversionErrors = 0;

for (const [index, note] of manifest.notes.entries()) {
  const suffix = note.rawHtmlPath.split("/")[1];
  const folder = note.folder.length > 0 ? note.folder : ["Notes"];
  const filename = `${safeSegment(note.title, "Untitled Note")}--${suffix}.md`;
  const markdownPath = join(markdownRoot, ...folder, filename);
  await mkdir(dirname(markdownPath), { recursive: true });
  try {
    await copySavedAttachments(note);
    const html = await readFile(join(output, note.rawHtmlPath), "utf8");
    const mapped = replaceAttachmentSources(html, attachmentSourceMap(note, markdownPath));
    embeddedImageTargets = savedImageTargets(note, markdownPath);
    embeddedImageFallback = makeEmbeddedImageFallback(note, markdownPath, suffix);
    const body = service.turndown(mapped).trim();
    const attachments = unreferencedAttachments(note, markdownPath, body);
    const attachmentSection = attachments.length > 0
      ? `\n\n## Attachments\n\n${attachments.join("\n")}`
      : "";
    const markdown = `${body}${attachmentSection}\n`;
    await writeFile(markdownPath, markdown, "utf8");
    note.markdownPath = relative(output, markdownPath).replaceAll("\\", "/");
    note.convertError = null;
    markdownCharacters += markdown.length;
    convertedNotes += 1;
  } catch (error) {
    note.convertError = String(error);
    conversionErrors += 1;
  }
  note.convertIndex = index;
}

manifest.aggregate.convertedNotes = convertedNotes;
manifest.aggregate.conversionErrors = conversionErrors;
manifest.aggregate.markdownCharacters = markdownCharacters;
manifest.timings.convertMs = Math.round(performance.now() - startedAt);
manifest.timings.pipelineMs = manifest.timings.totalMs + manifest.timings.convertMs;
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  aggregate: manifest.aggregate,
  timings: manifest.timings,
}));
