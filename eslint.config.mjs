import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Règles d'architecture (voir CLAUDE.md) : présentation → composition → service ← données.
  // Le service définit ses ports (src/services/ports.ts), la couche données les implémente,
  // src/composition.ts est le seul fichier qui branche les deux.
  {
    files: ["src/app/**", "src/presentation/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [
        { group: ["@/data", "@/data/*"], message: "Présentation : passe par un service (via @/composition), jamais par @/data." },
        { group: ["@libsql/*"], message: "Seule la couche données parle à la base." },
      ] }],
    },
  },
  {
    files: ["src/services/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [
        { group: ["@/data", "@/data/*", "@/composition"], message: "Service : reçoit ses ports en paramètre, n'importe pas la couche données." },
        { group: ["@/presentation", "@/presentation/*", "react", "react-dom", "next", "next/*"], message: "Service : ne dépend pas de l'interface." },
        { group: ["@libsql/*"], message: "Seule la couche données parle à la base." },
      ] }],
    },
  },
  {
    files: ["src/services/domain/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [
        { group: ["@/data", "@/data/*", "@/composition"], message: "Domaine : règles pures, aucune dépendance." },
        { group: ["@/presentation", "@/presentation/*", "react", "react-dom", "next", "next/*"], message: "Domaine : règles pures, aucune dépendance." },
        { group: ["@libsql/*"], message: "Domaine : règles pures, aucune dépendance." },
        { group: ["@/services/*", "!@/services/domain", "!@/services/domain/*", "../*"], message: "Domaine : n'importe que le domaine." },
      ] }],
    },
  },
  {
    files: ["src/data/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [
        { group: ["@/services/*", "!@/services/ports"], message: "Données : n'importe du service que ses ports (@/services/ports)." },
        { group: ["@/presentation", "@/presentation/*", "@/composition"], message: "Données : ne dépend ni de l'interface ni de la composition." },
      ] }],
    },
  },
  // Le proxy (src/proxy.ts) est une porte d'entrée : il ne lit que le verrou d'accès, rien d'autre de la couche données.
  {
    files: ["src/proxy.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [
        { group: ["@/data/*", "!@/data/access-gate"], message: "Proxy : n'importe que @/data/access-gate (et next/server)." },
        { group: ["@/services", "@/services/*", "@/composition", "@/presentation", "@/presentation/*"], message: "Proxy : n'importe que @/data/access-gate (et next/server)." },
        { group: ["@libsql/*"], message: "Seule la couche données parle à la base." },
      ] }],
    },
  },
  // Zéro God file, zéro spaghetti (.claude/rules/00-principes.md) : des plafonds, pas des objectifs.
  // Les composants shadcn générés (src/presentation/components/ui) et les tests en sont dispensés.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/presentation/components/ui/**", "src/**/*.test.{ts,tsx}"],
    rules: {
      "max-lines": ["error", { max: 250, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["error", { max: 60, skipBlankLines: true, skipComments: true }],
      complexity: ["error", 8],
      "max-depth": ["error", 3],
      "max-params": ["error", 3],
    },
  },
  // Dette au 2026-11-26 : ces fichiers dépassaient déjà un plafond quand il a été posé. Ils restent en
  // avertissement jusqu'à leur nettoyage ; on en retire un dès qu'il est conforme, on n'en ajoute jamais.
  {
    files: [
      "src/data/lead.repository.ts",
      "src/presentation/components/lead-form.tsx",
      "src/presentation/components/lead-sheet.tsx",
      "src/presentation/components/sequence-panel.tsx",
      "src/presentation/components/settings-dialog.tsx",
      "src/services/domain/lifecycle.ts",
      "src/services/lead.service.ts",
      "src/services/sequence.service.ts",
      "src/services/webhook.service.ts",
    ],
    rules: {
      "max-lines-per-function": ["warn", { max: 60, skipBlankLines: true, skipComments: true }],
      complexity: ["warn", 8],
      "max-params": ["warn", 3],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Copies du dépôt pour les agents en parallèle (claude --worktree).
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
