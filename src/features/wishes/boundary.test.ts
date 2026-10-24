import fs from "fs";
import path from "path";
import os from "os";
import ts from "typescript";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getFirebaseDb, getFirebaseApp } from "@/lib/firebase";

export interface TraversalViolation {
  serverRoot: string;
  chain: string[];
  forbiddenTarget: string;
}

export interface BoundaryDetectorOptions {
  rootDir: string;
  forbiddenModuleSpecifiers?: string[];
  forbiddenRelativeTargets?: string[];
}

/**
 * Checks whether the source file has a valid "use client" directive
 * as part of the initial directive prologue (ECMA-262 / Next.js specification).
 * Comments and BOM before the directive are valid trivia.
 * Any non-string-literal expression or other statement terminates the prologue.
 */
export function hasUseClientDirective(sourceFile: ts.SourceFile): boolean {
  for (const statement of sourceFile.statements) {
    if (ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression)) {
      if (statement.expression.text === "use client") {
        return true;
      }
      // Other string literal directives (e.g. "use strict") continue prologue
      continue;
    }
    // Any other statement terminates the directive prologue
    break;
  }
  return false;
}

/**
 * Extracts runtime module specifiers from ImportDeclaration and ExportDeclaration nodes.
 * Ignores purely type-only imports and re-exports.
 * Empty-clause, mixed type+value, namespace, default, and side-effect imports are treated as runtime edges.
 */
export function extractRuntimeSpecifiers(sourceFile: ts.SourceFile): string[] {
  const specifiers: string[] = [];

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const specifier = statement.moduleSpecifier.text;

      // Side-effect import: import "module";
      if (!statement.importClause) {
        specifiers.push(specifier);
        continue;
      }

      // Pure top-level type import: import type ... from "module";
      if (statement.importClause.isTypeOnly) {
        continue;
      }

      // Default import: import Foo from "module"; (runtime edge)
      if (statement.importClause.name) {
        specifiers.push(specifier);
        continue;
      }

      const namedBindings = statement.importClause.namedBindings;
      if (!namedBindings) {
        specifiers.push(specifier);
        continue;
      }

      // Namespace import: import * as Foo from "module"; (runtime edge)
      if (ts.isNamespaceImport(namedBindings)) {
        specifiers.push(specifier);
        continue;
      }

      // Named imports: import { ... } from "module";
      if (ts.isNamedImports(namedBindings)) {
        const elements = namedBindings.elements;
        // Empty-clause: import {} from "module"; (evaluates module at runtime)
        if (elements.length === 0) {
          specifiers.push(specifier);
          continue;
        }

        // Only ignore if EVERY element is explicitly type-only
        const allTypeOnly = elements.every((el) => el.isTypeOnly);
        if (allTypeOnly) {
          continue;
        }

        // Mixed type+value or normal value imports are runtime edges
        specifiers.push(specifier);
      }
    } else if (ts.isExportDeclaration(statement)) {
      // Local exports without module specifier (e.g. export { a };) are not import edges
      if (!statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) {
        continue;
      }
      const specifier = statement.moduleSpecifier.text;

      // Pure top-level type export: export type * from "module"; or export type { Foo } from "module";
      if (statement.isTypeOnly) {
        continue;
      }

      // Re-export all: export * from "module"; (runtime edge)
      if (!statement.exportClause) {
        specifiers.push(specifier);
        continue;
      }

      // Namespace re-export: export * as ns from "module"; (runtime edge, FIRE-07A)
      if (ts.isNamespaceExport(statement.exportClause)) {
        specifiers.push(specifier);
        continue;
      }

      // Named re-exports: export { ... } from "module";
      if (ts.isNamedExports(statement.exportClause)) {
        const elements = statement.exportClause.elements;
        // Empty-clause: export {} from "module"; (evaluates module at runtime)
        if (elements.length === 0) {
          specifiers.push(specifier);
          continue;
        }

        // Only ignore if EVERY element is explicitly type-only
        const allTypeOnly = elements.every((el) => el.isTypeOnly);
        if (allTypeOnly) {
          continue;
        }

        specifiers.push(specifier);
      }
    }
  }

  return specifiers;
}

export function resolveImportSpecifier(
  importerPath: string,
  specifier: string,
  rootDir: string
): { resolved: string | null; isExternal: boolean } {
  if (specifier === "firebase/app" || specifier === "firebase/firestore") {
    return { resolved: specifier, isExternal: true };
  }
  if (!specifier.startsWith("@/") && !specifier.startsWith("./") && !specifier.startsWith("../")) {
    return { resolved: specifier, isExternal: true };
  }

  let basePath = specifier;
  if (specifier.startsWith("@/")) {
    basePath = path.join(rootDir, "src", specifier.slice(2));
  } else {
    basePath = path.resolve(path.dirname(importerPath), specifier);
  }

  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.jsx`,
    path.join(basePath, "index.ts"),
    path.join(basePath, "index.tsx"),
    path.join(basePath, "index.js"),
    path.join(basePath, "index.jsx"),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) {
      return { resolved: c, isExternal: false };
    }
  }

  return { resolved: null, isExternal: false };
}

export function findTransitiveFirebasePaths(
  serverRootFile: string,
  options?: BoundaryDetectorOptions
): TraversalViolation[] {
  const rootDir = options?.rootDir ?? path.resolve(__dirname, "../../..");
  const forbiddenSpecifiers = options?.forbiddenModuleSpecifiers ?? [
    "firebase/app",
    "firebase/firestore",
  ];
  const forbiddenTargets = options?.forbiddenRelativeTargets ?? [
    "src/lib/firebase.ts",
    "src/features/wishes/firebase-adapter.ts",
  ];

  const violations: TraversalViolation[] = [];
  const visitedOnPath = new Set<string>();

  function dfs(currentFile: string, chain: string[]) {
    if (visitedOnPath.has(currentFile)) {
      // Safe cycle cutoff: prevents hanging on cyclic dependencies
      return;
    }

    if (!fs.existsSync(currentFile)) return;
    const content = fs.readFileSync(currentFile, "utf8");
    const sf = ts.createSourceFile(currentFile, content, ts.ScriptTarget.Latest, true);

    // If this node is NOT the server root and has a valid directive-prologue "use client",
    // it forms an approved Client Component boundary. Stop traversing down this branch.
    if (currentFile !== serverRootFile && hasUseClientDirective(sf)) {
      return;
    }

    visitedOnPath.add(currentFile);

    const specifiers = extractRuntimeSpecifiers(sf);
    for (const specifier of specifiers) {
      const { resolved, isExternal } = resolveImportSpecifier(currentFile, specifier, rootDir);

      if (isExternal && forbiddenSpecifiers.includes(specifier)) {
        violations.push({
          serverRoot: path.relative(rootDir, serverRootFile).replace(/\\/g, "/"),
          chain: [...chain, specifier],
          forbiddenTarget: specifier,
        });
        continue;
      }

      if (resolved) {
        const relResolved = path.relative(rootDir, resolved).replace(/\\/g, "/");

        // Direct/transitive reach to forbidden client-only target before a client boundary
        if (forbiddenTargets.includes(relResolved)) {
          violations.push({
            serverRoot: path.relative(rootDir, serverRootFile).replace(/\\/g, "/"),
            chain: [...chain, relResolved],
            forbiddenTarget: relResolved,
          });
          continue;
        }

        // Recurse into internal modules without "use client"
        dfs(resolved, [...chain, relResolved]);
      }
    }

    visitedOnPath.delete(currentFile);
  }

  const relRoot = path.relative(rootDir, serverRootFile).replace(/\\/g, "/");
  dfs(serverRootFile, [relRoot]);
  return violations;
}

describe("Wishes & Firestore Architectural Boundary Tests (FIRE-07)", () => {
  const rootDir = path.resolve(__dirname, "../../..");
  const sourceRoots = ["src/app", "src/features", "src/lib"];

  function getSourceFiles(dir: string): string[] {
    const fullPath = path.join(rootDir, dir);
    if (!fs.existsSync(fullPath)) return [];

    const entries = fs.readdirSync(fullPath, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      const entryPath = path.join(fullPath, entry.name);
      if (entry.isDirectory()) {
        const subFiles = getSourceFiles(path.relative(rootDir, entryPath));
        files.push(...subFiles);
      } else if (
        (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) &&
        !entry.name.endsWith(".test.ts") &&
        !entry.name.endsWith(".test.tsx") &&
        !entry.name.endsWith(".d.ts") &&
        !entryPath.includes(`${path.sep}testing${path.sep}`)
      ) {
        files.push(entryPath);
      }
    }

    return files;
  }

  it("ensures no server roots have direct or transitive paths to Firebase before a 'use client' boundary in actual repository (FIRE-03 / FIRE-07)", () => {
    const allSourceFiles = sourceRoots.flatMap(getSourceFiles);
    const serverFiles = allSourceFiles.filter((filePath) => {
      const content = fs.readFileSync(filePath, "utf8");
      const sf = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
      return !hasUseClientDirective(sf);
    });

    const allViolations: TraversalViolation[] = [];

    for (const serverFile of serverFiles) {
      const violations = findTransitiveFirebasePaths(serverFile, { rootDir });
      allViolations.push(...violations);
    }

    expect(
      allViolations,
      `Detected server files with transitive un-isolated paths to Firebase:\n${JSON.stringify(
        allViolations,
        null,
        2
      )}`
    ).toEqual([]);
  }, 30000);

  describe("Graph Traversal Mutation Test Matrix (FIRE-07 Evidence)", () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ayawarta-boundary-test-"));
    });

    afterEach(() => {
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it("detects direct multiline server import of firebase/firestore", () => {
      const serverFile = path.join(tempDir, "src/app/page.tsx");
      fs.mkdirSync(path.dirname(serverFile), { recursive: true });
      fs.writeFileSync(
        serverFile,
        `import {
          getFirestore,
        } from "firebase/firestore";
        export default function Page() { return null; }`
      );

      const violations = findTransitiveFirebasePaths(serverFile, { rootDir: tempDir });
      expect(violations).toHaveLength(1);
      expect(violations[0].forbiddenTarget).toBe("firebase/firestore");
      expect(violations[0].chain).toEqual(["src/app/page.tsx", "firebase/firestore"]);
    });

    it("detects transitive multiline export * from to firebase-adapter with full chain", () => {
      const serverFile = path.join(tempDir, "src/app/page.tsx");
      const barrelFile = path.join(tempDir, "src/features/wishes/barrel.ts");
      const adapterFile = path.join(tempDir, "src/features/wishes/firebase-adapter.ts");

      fs.mkdirSync(path.dirname(serverFile), { recursive: true });
      fs.mkdirSync(path.dirname(barrelFile), { recursive: true });

      fs.writeFileSync(adapterFile, `"use client"; export const defaultFirebaseWishesAdapter = {};`);
      fs.writeFileSync(
        barrelFile,
        `export * from
          "./firebase-adapter";`
      );
      fs.writeFileSync(
        serverFile,
        `import { defaultFirebaseWishesAdapter } from "@/features/wishes/barrel";
        export default function Page() { return null; }`
      );

      const violations = findTransitiveFirebasePaths(serverFile, { rootDir: tempDir });
      expect(violations).toHaveLength(1);
      expect(violations[0].forbiddenTarget).toBe("src/features/wishes/firebase-adapter.ts");
      expect(violations[0].chain).toEqual([
        "src/app/page.tsx",
        "src/features/wishes/barrel.ts",
        "src/features/wishes/firebase-adapter.ts",
      ]);
    });

    it("detects transitive multiline export * as ... from to firebase-adapter with full chain (FIRE-07A)", () => {
      const serverFile = path.join(tempDir, "src/app/page.tsx");
      const barrelFile = path.join(tempDir, "src/features/wishes/barrel.ts");
      const adapterFile = path.join(tempDir, "src/features/wishes/firebase-adapter.ts");

      fs.mkdirSync(path.dirname(serverFile), { recursive: true });
      fs.mkdirSync(path.dirname(barrelFile), { recursive: true });

      fs.writeFileSync(adapterFile, `"use client"; export const defaultFirebaseWishesAdapter = {};`);
      fs.writeFileSync(
        barrelFile,
        `export * as
          wishes from "./firebase-adapter";`
      );
      fs.writeFileSync(
        serverFile,
        `import { wishes } from "@/features/wishes/barrel";
        export default function Page() { return wishes; }`
      );

      const violations = findTransitiveFirebasePaths(serverFile, { rootDir: tempDir });
      expect(violations).toHaveLength(1);
      expect(violations[0].forbiddenTarget).toBe("src/features/wishes/firebase-adapter.ts");
      expect(violations[0].chain).toEqual([
        "src/app/page.tsx",
        "src/features/wishes/barrel.ts",
        "src/features/wishes/firebase-adapter.ts",
      ]);
    });

    it("ignores export type * as ... from as a type-only namespace re-export when server imports barrel at runtime, and detects positive control on same graph (FIRE-07B)", () => {
      const serverFile = path.join(tempDir, "src/app/page.tsx");
      const barrelFile = path.join(tempDir, "src/features/wishes/barrel.ts");
      const adapterFile = path.join(tempDir, "src/features/wishes/firebase-adapter.ts");

      fs.mkdirSync(path.dirname(serverFile), { recursive: true });
      fs.mkdirSync(path.dirname(barrelFile), { recursive: true });

      fs.writeFileSync(
        adapterFile,
        `"use client"; export const defaultFirebaseWishesAdapter = {}; export type AdapterType = string;`
      );

      // 1. Negative test: server root imports barrel via runtime side-effect import,
      // but barrel only re-exports type * as namespace. Traversal reaches barrel and stops.
      fs.writeFileSync(
        serverFile,
        `import "@/features/wishes/barrel";
        export default function Page() { return null; }`
      );
      fs.writeFileSync(
        barrelFile,
        `export type * as
          wishes from "./firebase-adapter";`
      );

      const negativeViolations = findTransitiveFirebasePaths(serverFile, { rootDir: tempDir });
      expect(negativeViolations).toEqual([]);

      // 2. Positive control on the exact same graph and paths: change barrel to multiline runtime export * as ...
      // Proves that detector actually traversed barrel and distinguishes type-only vs runtime namespace re-exports.
      fs.writeFileSync(
        barrelFile,
        `export * as
          wishes from "./firebase-adapter";`
      );

      const positiveViolations = findTransitiveFirebasePaths(serverFile, { rootDir: tempDir });
      expect(positiveViolations).toHaveLength(1);
      expect(positiveViolations[0].forbiddenTarget).toBe("src/features/wishes/firebase-adapter.ts");
      expect(positiveViolations[0].chain).toEqual([
        "src/app/page.tsx",
        "src/features/wishes/barrel.ts",
        "src/features/wishes/firebase-adapter.ts",
      ]);
    });

    it("detects both alias (@/) and relative (./) imports to forbidden targets", () => {
      const serverFile = path.join(tempDir, "src/app/page.tsx");
      const adapterFile = path.join(tempDir, "src/features/wishes/firebase-adapter.ts");
      const firebaseUtil = path.join(tempDir, "src/lib/firebase.ts");

      fs.mkdirSync(path.dirname(serverFile), { recursive: true });
      fs.mkdirSync(path.dirname(adapterFile), { recursive: true });
      fs.mkdirSync(path.dirname(firebaseUtil), { recursive: true });

      fs.writeFileSync(adapterFile, `"use client"; export const adapter = {};`);
      fs.writeFileSync(firebaseUtil, `"use client"; export const getDb = () => {};`);

      fs.writeFileSync(
        serverFile,
        `import { adapter } from "@/features/wishes/firebase-adapter";
        import { getDb } from "../lib/firebase";
        export default function Page() { return null; }`
      );

      const violations = findTransitiveFirebasePaths(serverFile, { rootDir: tempDir });
      expect(violations).toHaveLength(2);
      const targets = violations.map((v) => v.forbiddenTarget);
      expect(targets).toContain("src/features/wishes/firebase-adapter.ts");
      expect(targets).toContain("src/lib/firebase.ts");
    });

    it("allows server -> module with 'use client' boundary -> Firebase (0 violations)", () => {
      const serverFile = path.join(tempDir, "src/app/page.tsx");
      const clientIsland = path.join(tempDir, "src/components/ClientIsland.tsx");
      const adapterFile = path.join(tempDir, "src/features/wishes/firebase-adapter.ts");

      fs.mkdirSync(path.dirname(serverFile), { recursive: true });
      fs.mkdirSync(path.dirname(clientIsland), { recursive: true });
      fs.mkdirSync(path.dirname(adapterFile), { recursive: true });

      fs.writeFileSync(adapterFile, `"use client"; export const adapter = {};`);
      fs.writeFileSync(
        clientIsland,
        `"use client";
        import { adapter } from "@/features/wishes/firebase-adapter";
        export function ClientIsland() { return null; }`
      );
      fs.writeFileSync(
        serverFile,
        `import { ClientIsland } from "@/components/ClientIsland";
        export default function Page() { return <ClientIsland />; }`
      );

      const violations = findTransitiveFirebasePaths(serverFile, { rootDir: tempDir });
      expect(violations).toEqual([]);
    });

    it("handles cyclic dependencies safely without hanging or missing violations", () => {
      const fileA = path.join(tempDir, "src/moduleA.ts");
      const fileB = path.join(tempDir, "src/moduleB.ts");

      fs.mkdirSync(path.dirname(fileA), { recursive: true });

      fs.writeFileSync(fileA, `import { b } from "./moduleB"; export const a = 1;`);
      fs.writeFileSync(
        fileB,
        `import { a } from "./moduleA";
        import { getFirestore } from "firebase/firestore";
        export const b = 2;`
      );

      const violations = findTransitiveFirebasePaths(fileA, { rootDir: tempDir });
      expect(violations).toHaveLength(1);
      expect(violations[0].forbiddenTarget).toBe("firebase/firestore");
      expect(violations[0].chain).toEqual(["src/moduleA.ts", "src/moduleB.ts", "firebase/firestore"]);
    });

    it("ignores pure 'import type' and 'export type' (not runtime edges)", () => {
      const serverFile = path.join(tempDir, "src/app/page.tsx");
      const adapterFile = path.join(tempDir, "src/features/wishes/firebase-adapter.ts");

      fs.mkdirSync(path.dirname(serverFile), { recursive: true });
      fs.mkdirSync(path.dirname(adapterFile), { recursive: true });

      fs.writeFileSync(adapterFile, `"use client"; export type AdapterType = string;`);
      fs.writeFileSync(
        serverFile,
        `import type { Firestore } from "firebase/firestore";
        export type { AdapterType } from "@/features/wishes/firebase-adapter";
        export default function Page() { return null; }`
      );

      const violations = findTransitiveFirebasePaths(serverFile, { rootDir: tempDir });
      expect(violations).toEqual([]);
    });

    it("ignores specifier-level 'import { type Foo }' and 'export { type Foo } from'", () => {
      const serverFile = path.join(tempDir, "src/app/page.tsx");
      const adapterFile = path.join(tempDir, "src/features/wishes/firebase-adapter.ts");

      fs.mkdirSync(path.dirname(serverFile), { recursive: true });
      fs.mkdirSync(path.dirname(adapterFile), { recursive: true });

      fs.writeFileSync(adapterFile, `"use client"; export type AdapterType = string;`);
      fs.writeFileSync(
        serverFile,
        `import { type Firestore } from "firebase/firestore";
        export { type AdapterType } from "@/features/wishes/firebase-adapter";
        export default function Page() { return null; }`
      );

      const violations = findTransitiveFirebasePaths(serverFile, { rootDir: tempDir });
      expect(violations).toEqual([]);
    });

    it("detects mixed type+value imports and re-exports as runtime edges", () => {
      const serverFileImport = path.join(tempDir, "src/app/mixed-import.tsx");
      const serverFileExport = path.join(tempDir, "src/app/mixed-export.tsx");
      const adapterFile = path.join(tempDir, "src/features/wishes/firebase-adapter.ts");

      fs.mkdirSync(path.dirname(serverFileImport), { recursive: true });
      fs.mkdirSync(path.dirname(adapterFile), { recursive: true });

      fs.writeFileSync(adapterFile, `"use client"; export type AdapterType = string; export const value = 1;`);

      fs.writeFileSync(
        serverFileImport,
        `import {
          type Firestore,
          getFirestore,
        } from "firebase/firestore";`
      );
      fs.writeFileSync(
        serverFileExport,
        `export {
          type AdapterType,
          value,
        } from "@/features/wishes/firebase-adapter";`
      );

      const violationsImport = findTransitiveFirebasePaths(serverFileImport, { rootDir: tempDir });
      expect(violationsImport).toHaveLength(1);
      expect(violationsImport[0].forbiddenTarget).toBe("firebase/firestore");

      const violationsExport = findTransitiveFirebasePaths(serverFileExport, { rootDir: tempDir });
      expect(violationsExport).toHaveLength(1);
      expect(violationsExport[0].forbiddenTarget).toBe("src/features/wishes/firebase-adapter.ts");
    });

    it("detects empty-clause 'import {} from' and 'export {} from' as runtime edges", () => {
      const emptyImportFile = path.join(tempDir, "src/app/empty-import.tsx");
      const emptyExportFile = path.join(tempDir, "src/app/empty-export.tsx");
      const adapterFile = path.join(tempDir, "src/features/wishes/firebase-adapter.ts");

      fs.mkdirSync(path.dirname(emptyImportFile), { recursive: true });
      fs.mkdirSync(path.dirname(adapterFile), { recursive: true });

      fs.writeFileSync(adapterFile, `"use client"; export const x = 1;`);

      fs.writeFileSync(emptyImportFile, `import {} from "firebase/firestore";`);
      fs.writeFileSync(emptyExportFile, `export {} from "@/features/wishes/firebase-adapter";`);

      const violationsImport = findTransitiveFirebasePaths(emptyImportFile, { rootDir: tempDir });
      expect(violationsImport).toHaveLength(1);
      expect(violationsImport[0].forbiddenTarget).toBe("firebase/firestore");

      const violationsExport = findTransitiveFirebasePaths(emptyExportFile, { rootDir: tempDir });
      expect(violationsExport).toHaveLength(1);
      expect(violationsExport[0].forbiddenTarget).toBe("src/features/wishes/firebase-adapter.ts");
    });

    it("rejects string 'use client' placed after a statement (late directive is not a boundary)", () => {
      const lateClientFile = path.join(tempDir, "src/components/LateClient.tsx");
      const serverFile = path.join(tempDir, "src/app/page.tsx");

      fs.mkdirSync(path.dirname(lateClientFile), { recursive: true });
      fs.mkdirSync(path.dirname(serverFile), { recursive: true });

      fs.writeFileSync(
        lateClientFile,
        `const initialValue = 42;
        "use client";
        import { getFirestore } from "firebase/firestore";
        export function LateClient() { return initialValue; }`
      );
      fs.writeFileSync(
        serverFile,
        `import { LateClient } from "@/components/LateClient";
        export default function Page() { return null; }`
      );

      const violations = findTransitiveFirebasePaths(serverFile, { rootDir: tempDir });
      expect(violations).toHaveLength(1);
      expect(violations[0].forbiddenTarget).toBe("firebase/firestore");
      expect(violations[0].chain).toEqual([
        "src/app/page.tsx",
        "src/components/LateClient.tsx",
        "firebase/firestore",
      ]);
    });

    it("verifies src/features/wishes/index.ts is a pure domain barrel without firebase-adapter export", () => {
      const barrelContent = fs.readFileSync(
        path.join(rootDir, "src/features/wishes/index.ts"),
        "utf8"
      );
      expect(barrelContent).not.toContain("firebase-adapter");
    });

    it("verifies src/lib/firebase.ts explicitly declares 'use client' in directive prologue and contains no db proxy", () => {
      const firebaseContent = fs.readFileSync(
        path.join(rootDir, "src/lib/firebase.ts"),
        "utf8"
      );
      const sf = ts.createSourceFile("firebase.ts", firebaseContent, ts.ScriptTarget.Latest, true);
      expect(hasUseClientDirective(sf)).toBe(true);
      expect(firebaseContent).not.toContain("export const db");
    });
  });

  it("ensures no server-only credentials or Prisma modules are imported in wishes feature", () => {
    const wishesDir = path.join(rootDir, "src/features/wishes");
    const wishesFiles = getSourceFiles(path.relative(rootDir, wishesDir));
    const wishesSectionPath = path.join(
      rootDir,
      "src/app/(templates)/wedding/classic-rose/[variant]/components/WishesSection.tsx"
    );
    const filesToCheck = [...wishesFiles, wishesSectionPath];

    const forbiddenTokens = [
      ["DATABASE", "_URL"].join(""),
      ["AUTH", "_SECRET"].join(""),
      ["CLOUDINARY", "_API_SECRET"].join(""),
      ["ADMIN", "_PASSWORD"].join(""),
      ["@prisma", "/client"].join(""),
      ["@/lib", "/server/db"].join(""),
      ["@/lib", "/server/env"].join(""),
      ["server", "-only"].join(""),
    ];

    const violations: Array<{ file: string; match: string }> = [];

    for (const file of filesToCheck) {
      if (!fs.existsSync(file)) continue;
      const content = fs.readFileSync(file, "utf8");
      const relPath = path.relative(rootDir, file).replace(/\\/g, "/");

      for (const token of forbiddenTokens) {
        if (content.includes(token)) {
          violations.push({ file: relPath, match: token });
        }
      }
    }

    expect(
      violations,
      `Found server-only imports or credentials in wishes client boundary:\n${JSON.stringify(
        violations,
        null,
        2
      )}`
    ).toEqual([]);
  });

  it("ensures no console.error leaks raw Firebase error objects in wishes feature", () => {
    const wishesDir = path.join(rootDir, "src/features/wishes");
    const wishesFiles = getSourceFiles(path.relative(rootDir, wishesDir));
    const wishesSectionPath = path.join(
      rootDir,
      "src/app/(templates)/wedding/classic-rose/[variant]/components/WishesSection.tsx"
    );
    const filesToCheck = [...wishesFiles, wishesSectionPath];

    const violations: string[] = [];

    for (const file of filesToCheck) {
      if (!fs.existsSync(file)) continue;
      const content = fs.readFileSync(file, "utf8");
      const relPath = path.relative(rootDir, file).replace(/\\/g, "/");

      if (content.includes("console.error")) {
        violations.push(relPath);
      }
    }

    expect(
      violations,
      `Found console.error in wishes files (raw errors must be sanitized):\n${violations.join(
        "\n"
      )}`
    ).toEqual([]);
  });

  it("fails closed when getFirebaseDb or getFirebaseApp is called on the server", () => {
    // In Node test environment, window is undefined
    if (typeof window === "undefined") {
      expect(() => getFirebaseDb()).toThrow(
        /Firestore client SDK must not be accessed on the server/
      );
      expect(() => getFirebaseApp()).toThrow(
        /Firebase client SDK must not be accessed on the server/
      );
    }
  });
});
