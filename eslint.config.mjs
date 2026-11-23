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
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
