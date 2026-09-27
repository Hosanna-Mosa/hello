import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "coverage/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          // The two build scripts are plain `.mjs` on purpose — `prebuild` has
          // to run before any TypeScript loader is guaranteed to exist on a
          // deploy host — so they belong to no tsconfig program and typed
          // linting has to be told about them explicitly.
          allowDefaultProject: ["scripts/*.mjs"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": "error",
      eqeqeq: ["error", "always"],
    },
  },
  {
    // A build script that cannot report what it did is not worth running.
    // `no-undef` needs the Node globals named: it is off for TypeScript files,
    // where the `@types/node` program supplies them, and these two are JS.
    files: ["scripts/*.mjs"],
    languageOptions: { globals: { console: "readonly", process: "readonly" } },
    rules: { "no-console": "off" },
  },
);
