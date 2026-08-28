/**
 * generate-aws-manifest.mjs
 * Scans ALL icon sets in public/icons/ and generates:
 *   excalidraw-app/data/awsIcons.ts — typed manifest with INLINE SVG data-URIs
 *
 * This eliminates all network requests for icons — they load from JS memory.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { join, basename, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ICONS_BASE = join(ROOT, "public", "icons");

// AWS Architecture Icons release date (quarterly: Q1 end of Jan, Q2 end of Apr, Q3 end of Jul)
const ICON_SET_DATE = "07312026";

// ─── Labels ──────────────────────────────────────────────────────────────────

const SERVICE_LABELS = {
  "Arch_Analytics": "Analytics",
  "Arch_Application-Integration": "App Integration",
  "Arch_Artificial-Intelligence": "Artificial Intelligence",
  "Arch_Blockchain": "Blockchain",
  "Arch_Business-Applications": "Business Applications",
  "Arch_Cloud-Financial-Management": "Cloud Financial Management",
  "Arch_Compute": "Compute",
  "Arch_Containers": "Containers",
  "Arch_Customer-Enablement": "Customer Enablement",
  "Arch_Databases": "Database",
  "Arch_Developer-Tools": "Developer Tools",
  "Arch_End-User-Computing": "End User Computing",
  "Arch_Front-End-Web-Mobile": "Frontend & Mobile",
  "Arch_Games": "Games",
  "Arch_General-Icons": "General",
  "Arch_Internet-of-Things": "Internet of Things",
  "Arch_Management-Tools": "Management & Governance",
  "Arch_Media-Services": "Media Services",
  "Arch_Migration-Modernization": "Migration & Modernization",
  "Arch_Networking-Content-Delivery": "Networking & Content Delivery",
  "Arch_Quantum-Technologies": "Quantum Technologies",
  "Arch_Satellite": "Satellite",
  "Arch_Security-Identity": "Security, Identity & Compliance",
  "Arch_Storage": "Storage",
};

const RESOURCE_LABELS = {
  "Res_Analytics": "Analytics",
  "Res_Application-Integration": "App Integration",
  "Res_Artificial-Intelligence": "Artificial Intelligence",
  "Res_Blockchain": "Blockchain",
  "Res_Business-Applications": "Business Applications",
  "Res_Compute": "Compute",
  "Res_Containers": "Containers",
  "Res_Databases": "Database",
  "Res_Developer-Tools": "Developer Tools",
  "Res_End-User-Computing": "End User Computing",
  "Res_Front-End-Web-Mobile": "Frontend & Mobile",
  "Res_General-Icons": "General",
  "Res_IoT": "Internet of Things",
  "Res_Management-Governance": "Management & Governance",
  "Res_Media-Services": "Media Services",
  "Res_Migration-Modernization": "Migration & Modernization",
  "Res_Networking-Content-Delivery": "Networking & Content Delivery",
  "Res_Quantum-Technologies": "Quantum Technologies",
  "Res_Security-Identity": "Security, Identity & Compliance",
  "Res_Storage": "Storage",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function svgToDataUri(filePath) {
  const svg = readFileSync(filePath, "utf8").trim();
  const encoded = svg
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/#/g, "%23")
    .replace(/"/g, "'");
  return `data:image/svg+xml,${encoded}`;
}

function cleanServiceName(filename) {
  return filename
    .replace(/^Arch_/, "")
    .replace(/^Res_/, "")
    .replace(/_64$/, "")
    .replace(/_48$/, "")
    .replace(/_32$/, "")
    .replace(/^Amazon-/, "Amazon ")
    .replace(/^AWS-/, "AWS ")
    .replace(/^Apache-/, "Apache ")
    .replace(/^PyTorch-/, "PyTorch ")
    .replace(/-/g, " ");
}

function cleanGroupName(filename) {
  return filename
    .replace(/_32$/, "")
    .replace(/_32_Dark$/, " (Dark)")
    .replace(/-/g, " ");
}

function cleanCategoryName(filename) {
  return filename
    .replace(/^Arch-Category_/, "")
    .replace(/_64$/, "")
    .replace(/-/g, " ");
}

// ─── Scanners ────────────────────────────────────────────────────────────────

function scanServiceIcons() {
  const SERVICE_BASE = join(ICONS_BASE, "Architecture-Service-Icons_" + ICON_SET_DATE + "");
  const categories = [];
  const catDirs = readdirSync(SERVICE_BASE).filter((d) =>
    statSync(join(SERVICE_BASE, d)).isDirectory()
  ).sort();

  for (const catDir of catDirs) {
    const catPath = join(SERVICE_BASE, catDir, "64");
    let files = [];
    try {
      files = readdirSync(catPath).filter((f) => f.endsWith("_64.svg"));
    } catch { continue; }

    const icons = files.map((filename) => {
      const name = cleanServiceName(basename(filename, ".svg"));
      const dataUri = svgToDataUri(join(catPath, filename));
      const id = filename.replace(".svg", "").replace(/[^a-zA-Z0-9]/g, "_");
      return { id, name, dataUri };
    });

    if (icons.length === 0) continue;
    categories.push({
      id: catDir,
      label: SERVICE_LABELS[catDir] || catDir.replace("Arch_", "").replace(/-/g, " "),
      icons,
    });
  }
  return categories;
}

function scanGroupIcons() {
  const dir = join(ICONS_BASE, "Architecture-Group-Icons_" + ICON_SET_DATE + "");
  const files = readdirSync(dir).filter((f) => f.endsWith(".svg") && !f.includes("_Dark"));
  return files.map((filename) => {
    const name = cleanGroupName(basename(filename, ".svg"));
    const dataUri = svgToDataUri(join(dir, filename));
    const id = filename.replace(".svg", "").replace(/[^a-zA-Z0-9]/g, "_");
    return { id, name, dataUri };
  });
}

function scanCategoryIcons() {
  const dir = join(ICONS_BASE, "Category-Icons_" + ICON_SET_DATE + "", "Arch-Category_64");
  let files = [];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".svg"));
  } catch { return []; }

  return files.map((filename) => {
    const name = cleanCategoryName(basename(filename, ".svg"));
    const dataUri = svgToDataUri(join(dir, filename));
    const id = filename.replace(".svg", "").replace(/[^a-zA-Z0-9]/g, "_");
    return { id, name, dataUri };
  });
}

function scanResourceIcons() {
  const RESOURCE_BASE = join(ICONS_BASE, "Resource-Icons_" + ICON_SET_DATE + "");
  const categories = [];
  const catDirs = readdirSync(RESOURCE_BASE).filter((d) =>
    statSync(join(RESOURCE_BASE, d)).isDirectory()
  ).sort();

  for (const catDir of catDirs) {
    const catPath = join(RESOURCE_BASE, catDir);
    let files = [];
    try {
      files = readdirSync(catPath).filter((f) => f.endsWith("_48.svg"));
    } catch { continue; }

    if (files.length === 0) {
      const subPath = join(catPath, "Res_48_Light");
      try {
        files = readdirSync(subPath).filter((f) => f.endsWith(".svg"));
      } catch { continue; }
      if (files.length === 0) continue;

      const icons = files.map((filename) => {
        const name = cleanServiceName(basename(filename, ".svg"));
        const dataUri = svgToDataUri(join(subPath, filename));
        const id = filename.replace(".svg", "").replace(/[^a-zA-Z0-9]/g, "_");
        return { id, name, dataUri };
      });
      categories.push({
        id: catDir,
        label: RESOURCE_LABELS[catDir] || catDir.replace("Res_", "").replace(/-/g, " "),
        icons,
      });
      continue;
    }

    const icons = files.map((filename) => {
      const name = cleanServiceName(basename(filename, ".svg"));
      const dataUri = svgToDataUri(join(catPath, filename));
      const id = filename.replace(".svg", "").replace(/[^a-zA-Z0-9]/g, "_");
      return { id, name, dataUri };
    });

    if (icons.length === 0) continue;
    categories.push({
      id: catDir,
      label: RESOURCE_LABELS[catDir] || catDir.replace("Res_", "").replace(/-/g, " "),
      icons,
    });
  }
  return categories;
}

// ─── Generate ────────────────────────────────────────────────────────────────

const serviceCategories = scanServiceIcons();
const groupIcons = scanGroupIcons();
const categoryIcons = scanCategoryIcons();
const resourceCategories = scanResourceIcons();

const totalService = serviceCategories.reduce((a, c) => a + c.icons.length, 0);
const totalResource = resourceCategories.reduce((a, c) => a + c.icons.length, 0);
const totalAll = totalService + groupIcons.length + categoryIcons.length + totalResource;

const tsLines = [
  `// AUTO-GENERATED by scripts/generate-aws-manifest.mjs — DO NOT EDIT`,
  `// Icons are inlined as SVG data-URIs for zero-network-request performance.`,
  ``,
  `export interface AwsIcon {`,
  `  id: string;`,
  `  name: string;`,
  `  dataUri: string;`,
  `}`,
  ``,
  `export interface AwsCategory {`,
  `  id: string;`,
  `  label: string;`,
  `  icons: AwsIcon[];`,
  `}`,
  ``,
  `export const SERVICE_CATEGORIES: AwsCategory[] = ${JSON.stringify(serviceCategories)};`,
  ``,
  `export const GROUP_ICONS: AwsIcon[] = ${JSON.stringify(groupIcons)};`,
  ``,
  `export const CATEGORY_ICONS: AwsIcon[] = ${JSON.stringify(categoryIcons)};`,
  ``,
  `export const RESOURCE_CATEGORIES: AwsCategory[] = ${JSON.stringify(resourceCategories)};`,
  ``,
  `export const ALL_SERVICE_ICONS: AwsIcon[] = SERVICE_CATEGORIES.flatMap((c) => c.icons);`,
  `export const ALL_RESOURCE_ICONS: AwsIcon[] = RESOURCE_CATEGORIES.flatMap((c) => c.icons);`,
  `export const ALL_AWS_ICONS: AwsIcon[] = [...ALL_SERVICE_ICONS, ...GROUP_ICONS, ...CATEGORY_ICONS, ...ALL_RESOURCE_ICONS];`,
  `export const TOTAL_ICON_COUNT = ${totalAll};`,
  ``,
  `// Pre-built search index: lowercase name -> icon reference`,
  `const _searchIndex: Map<string, AwsIcon> = new Map(ALL_AWS_ICONS.map(i => [i.name.toLowerCase(), i]));`,
  `export const searchIcons = (query: string): AwsIcon[] => {`,
  `  const q = query.toLowerCase().trim();`,
  `  if (!q) return [];`,
  `  return ALL_AWS_ICONS.filter(i => i.name.toLowerCase().includes(q));`,
  `};`,
  ``,
];

const tsOut = join(ROOT, "excalidraw-app", "data", "awsIcons.ts");
writeFileSync(tsOut, tsLines.join("\n"), "utf8");

const fileSizeKB = Math.round(readFileSync(tsOut).length / 1024);
console.log(`✅ awsIcons.ts generated (${fileSizeKB} KB)`);
console.log(`   Architecture Service: ${totalService} icons`);
console.log(`   Architecture Group:   ${groupIcons.length} icons`);
console.log(`   Category:             ${categoryIcons.length} icons`);
console.log(`   Resource:             ${totalResource} icons`);
console.log(`   TOTAL:                ${totalAll} icons (inline data-URIs)`);
