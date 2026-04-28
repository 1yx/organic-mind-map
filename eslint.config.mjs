// ESLint Flat Config (ESM)
// Design goal: maximize consistency, type safety, and async correctness in AI-generated code.

import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import prettierPlugin from "eslint-plugin-prettier";
import eslintConfigPrettier from "eslint-config-prettier";
import tsdocPlugin from "eslint-plugin-tsdoc";
import jsdocPlugin from "eslint-plugin-jsdoc";
import checkFile from "eslint-plugin-check-file";
import globals from "globals";

// ========== Inline Custom Rules ==========

/** @type {import('eslint').Rule.RuleModule} */
/* eslint-disable complexity */
const globalLiteralConstNaming = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Enforce UPPER_SNAKE_CASE for global const with literal values",
    },
    messages: {
      upperSnake:
        "Global const with a literal value should use UPPER_SNAKE_CASE. Rename `{{name}}` to `{{suggested}}`.",
    },
    schema: [],
  },
  /** @param {import('eslint').Rule.RuleContext} context */
  create(context) {
    return {
      VariableDeclaration(node) {
        if (node.kind !== "const") return;
        if (node.parent.type !== "Program") return;

        for (const decl of node.declarations) {
          if (decl.id.type !== "Identifier") continue;
          if (!decl.init) continue;

          const init = decl.init;
          const isLiteral =
            init.type === "Literal" ||
            (init.type === "TemplateLiteral" &&
              init.expressions.length === 0) ||
            (init.type === "UnaryExpression" &&
              init.argument.type === "Literal");

          if (!isLiteral) continue;

          const name = decl.id.name;
          if (/^[A-Z][A-Z0-9_]*$/.test(name)) continue;

          context.report({
            node: decl.id,
            messageId: "upperSnake",
            data: {
              name,
              suggested: name.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase(),
            },
          });
        }
      },
    };
  },
};

export default [
  {
    // Ignore build artifacts and third-party dependencies to reduce noise.
    ignores: [
      // Node dependencies.
      "node_modules/**",
      // Common build output directories.
      "**/dist/**",
      // Test coverage output.
      "coverage/**",
      // ESLint config itself — not in tsconfig, TSDoc comments cause warnings.
      "eslint.config.mjs",
      // Config files not included in any tsconfig.
      "vitest.config.ts",
      "**/vite.config.ts",
    ],
  },
  {
    // Applies to all JS/TS source files.
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],

    languageOptions: {
      // Use the latest ECMAScript syntax to minimise version-related ambiguity.
      ecmaVersion: "latest",
      // Project-wide ES Module convention.
      sourceType: "module",
      // All TS files are parsed by @typescript-eslint/parser.
      parser: tsParser,
      parserOptions: {
        sourceType: "module",
        ecmaVersion: "latest",
        // Enable type-aware linting — required by the Promise-safety and unsafe-* rules below.
        // Without this, the most valuable @typescript-eslint rules are silently disabled.
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        // Pull in the full Node.js global set (process, Buffer, setTimeout, etc.)
        // instead of listing them manually to avoid accidental omissions.
        ...globals.node,
      },
    },

    plugins: {
      // TypeScript-specific lint rules.
      "@typescript-eslint": tsPlugin,
      // Runs Prettier as an ESLint rule so formatting failures surface in one pass.
      prettier: prettierPlugin,
      // Validates TSDoc comment syntax.
      tsdoc: tsdocPlugin,
      // Checks that JSDoc/TSDoc declarations exist where required.
      jsdoc: jsdocPlugin,
      // Enforces filename naming conventions.
      "check-file": checkFile,
      // Project-specific custom rules.
      custom: {
        rules: {
          "global-literal-const-naming": globalLiteralConstNaming,
        },
      },
    },

    rules: {
      // ========== Naming Conventions ==========
      //
      // | Rule                                       | Behavior                                                             |
      // |--------------------------------------------|----------------------------------------------------------------------|
      // | `custom/global-literal-const-naming`       | Global const + literal init → UPPER_SNAKE_CASE                       |
      // | `naming-convention` global const            | UPPER_CASE or camelCase (complex objects exempt via custom rule)     |
      // | `naming-convention` variable/function/param | camelCase only, leading underscore allowed as ignore marker          |
      // | `naming-convention` property                | Skipped (HTTP headers, i18n keys, API response fields)               |
      // | `naming-convention` typeLike                | PascalCase (class, interface, type alias, enum)                      |
      // | `check-file/filename-naming-convention`     | kebab-case for src/test files                                        |
      //

      // Global const with literal values must be UPPER_SNAKE_CASE.
      // Only catches simple literals (strings, numbers, booleans, regex, template literals
      // without expressions) — Zod schemas, object instances, etc. are exempt.
      "custom/global-literal-const-naming": "error",

      // Enforce symbol naming conventions.
      "@typescript-eslint/naming-convention": [
        "error",
        // Classes, interfaces, type aliases, enums: PascalCase
        { selector: "typeLike", format: ["PascalCase"] },
        // Zod Schemas (ending in Schema): PascalCase or camelCase
        {
          selector: "variable",
          format: ["PascalCase", "camelCase"],
          filter: { regex: "Schema$", match: true },
        },
        // Global const: UPPER_CASE or camelCase (literal consts enforced by custom rule)
        {
          selector: "variable",
          modifiers: ["const", "global"],
          format: ["UPPER_CASE", "camelCase"],
        },
        // Other variables, functions, parameters: camelCase (leading underscore allowed)
        {
          selector: ["variable", "function", "parameter"],
          format: ["camelCase"],
          leadingUnderscore: "allow",
        },
        // Property names skip (HTTP Headers, i18n keys, API response fields)
        {
          selector: "property",
          format: null,
        },
      ],

      // Enforce filename naming conventions: kebab-case.
      "check-file/filename-naming-convention": [
        "error",
        {
          "src/**/*.{js,mjs,cjs,ts,mts,cts}": "KEBAB_CASE",
          "test/**/*.{js,mjs,cjs,ts,mts,cts}": "KEBAB_CASE",
          "tests/**/*.{js,mjs,cjs,ts,mts,cts}": "KEBAB_CASE",
          "scripts/**/*.{js,mjs,cjs,ts,mts,cts}": "KEBAB_CASE",
        },
        {
          ignoreMiddleExtensions: true,
        },
      ],

      // ========== Code Quality Limits ==========
      //
      // Thresholds are set at maintainability boundaries, not aspirational targets.
      // All limits are enforced as errors — code that exceeds them must be refactored
      // before merging, not deferred.
      //
      // | Rule                      | Limit  | Rationale                                      |
      // |---------------------------|--------|------------------------------------------------|
      // | Function length (lines)   | 50     | Beyond 50 lines, intent becomes hard to scan   |
      // | File length (lines)       | 500    | Beyond 500 lines, consider splitting modules   |
      // | Nesting depth (levels)    | 4      | Deep nesting exponentially hides control flow  |
      // | Function parameters       | 3      | More than 3 → wrap in an options object        |
      // | Cyclomatic complexity     | 10     | Beyond 10, test cases multiply combinatorially |
      //
      "max-lines-per-function": [
        "error",
        { max: 50, skipBlankLines: true, skipComments: true },
      ],
      "max-lines": [
        "error",
        { max: 500, skipBlankLines: true, skipComments: true },
      ],
      "max-depth": ["error", 4],
      "max-params": ["error", 3],
      complexity: ["error", 10],

      // ========== Core Code Style ==========

      // Delegate unused-var enforcement to the TS version to avoid duplicate reports.
      "no-unused-vars": "off",
      // Disallow var — block scoping prevents implicit hoisting surprises.
      "no-var": "error",
      // Prefer const everywhere possible to reduce mutable-state cognitive load.
      "prefer-const": ["error", { destructuring: "all" }],
      // Always use strict equality; null is the only exception (x == null catches undefined too).
      eqeqeq: ["error", "always", { null: "ignore" }],
      // Require braces on all control-flow branches — AI frequently omits them on single-liners.
      curly: ["error", "all"],
      // Enforce object method/property shorthand for consistent output shape.
      "object-shorthand": "error",
      // Enforce template literals over string concatenation to eliminate style forks.
      "prefer-template": "error",
      // Disallow duplicate imports — reduces redundant context in AI-generated files.
      "no-duplicate-imports": "error",
      // Disallow unreachable code — prevents AI from emitting dead branches.
      "no-unreachable": "error",
      // Disallow unsafe optional chaining patterns that collapse at runtime.
      "no-unsafe-optional-chaining": "error",
      // Allow console — CLI/automation projects legitimately rely on process logs.
      "no-console": "off",
      // Warn on debugger statements so they can't silently land in production.
      "no-debugger": "warn",
      // Surface Prettier formatting violations as ESLint errors for a single-pass fix.
      "prettier/prettier": ["error", {}, { usePrettierrc: true }],

      // ========== TypeScript ==========

      // Unused variables: allow _ prefix as an intentional discard marker.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // Enforce type-only imports to prevent accidental runtime-side-effect imports.
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          disallowTypeAnnotations: false,
          fixStyle: "inline-type-imports",
        },
      ],

      // Unify on `type` aliases — mixing interface and type creates unnecessary style forks.
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],

      // Disallow implicit require() calls — keeps ESM semantics consistent throughout.
      "@typescript-eslint/no-require-imports": "error",

      // Warn on explicit `any` — AI habitually reaches for any to silence type errors.
      // Use `unknown` + narrowing, or a more specific type.
      "@typescript-eslint/no-explicit-any": "warn",

      // Disallow assigning values typed as `any` — catches the silent spread of any.
      // Requires type-aware parsing (parserOptions.project).
      "@typescript-eslint/no-unsafe-assignment": "warn",

      // Disallow returning `any` from functions — keeps return types trustworthy.
      // Requires type-aware parsing.
      "@typescript-eslint/no-unsafe-return": "warn",

      // ========== Async / Promise Safety ==========
      // AI Agent code is overwhelmingly async; these rules catch the most common failure modes.
      // All three rules require type-aware parsing (parserOptions.project).

      // Disallow unhandled floating Promises — the leading cause of silent failures in agents.
      "@typescript-eslint/no-floating-promises": "error",

      // Disallow Promises in positions where they are not properly awaited or handled,
      // e.g. `if (asyncFn())` or passing an async callback to a non-async event handler.
      "@typescript-eslint/no-misused-promises": "error",

      // Disallow awaiting a value that is not actually a Promise.
      // Catches `await nonAsyncFn()` before it silently becomes a no-op.
      "@typescript-eslint/await-thenable": "error",

      // Warn on async functions that contain no await expression.
      // Usually indicates either a forgotten await or an unnecessary async keyword.
      "@typescript-eslint/require-await": "warn",

      // ========== TSDoc ==========

      // Validate TSDoc comment syntax at warn level.
      "tsdoc/syntax": "warn",
    },
  },
  {
    // Restrict date/time APIs across src, tests, and scripts.
    // All temporal logic must go through the Temporal API (tc39/proposal-temporal),
    // which is available natively in modern runtimes or via @js-temporal/polyfill.
    //
    // Rationale: Temporal is unambiguous, immutable-by-default, and timezone-aware.
    // The legacy Date object has well-known footguns (mutable, month 0-indexed,
    // implicit local-timezone coercion) that AI frequently mishandles.
    files: [
      "src/**/*.{js,mjs,cjs,ts,mts,cts}",
      "tests/**/*.{js,mjs,cjs,ts,mts,cts}",
      "scripts/**/*.{js,mjs,cjs,ts,mts,cts}",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        // Block `new Date(...)` — use Temporal.PlainDate / Temporal.ZonedDateTime instead.
        {
          selector: "NewExpression[callee.name='Date']",
          message:
            "Use the Temporal API (Temporal.Now.zonedDateTimeISO(), Temporal.PlainDate.from(), etc.) instead of new Date().",
        },
      ],
      "no-restricted-properties": [
        "error",
        // Block `Date.now()` — use Temporal.Now.instant().epochMilliseconds instead.
        {
          object: "Date",
          property: "now",
          message:
            "Use Temporal.Now.instant().epochMilliseconds instead of Date.now().",
        },
        // Block `Date.parse()` — use Temporal.Instant.from(...).epochMilliseconds instead.
        {
          object: "Date",
          property: "parse",
          message:
            "Use Temporal.Instant.from(isoString).epochMilliseconds instead of Date.parse().",
        },
      ],
    },
  },
  {
    // Restrict dangerous TypeScript escape hatches across src.
    // AI frequently uses `as` and `!` to silence type errors rather than handling them.
    files: ["src/**/*.{js,mjs,cjs,ts,mts,cts}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        // Disallow type assertions (as SomeType) — prefer type guards or correct inference.
        {
          selector: "TSAsExpression",
          message:
            "Avoid type assertions (as). Use a type guard, explicit annotation, or correct inference instead.",
        },
        // Disallow non-null assertions (!) — prefer explicit null/undefined handling.
        {
          selector: "TSNonNullExpression",
          message:
            "Avoid non-null assertions (!). Handle null/undefined explicitly or refine the type.",
        },
      ],
      // Require JSDoc/TSDoc on all public declarations in src to keep the codebase
      // navigable without reading implementation details.
      "jsdoc/require-jsdoc": [
        "warn",
        {
          require: {
            FunctionDeclaration: true,
            // Function expressions assigned to variables are treated the same as declarations.
            FunctionExpression: true,
            // Exclude arrow functions — short callbacks and inline transforms are too noisy.
            ArrowFunctionExpression: false,
            ClassDeclaration: true,
            MethodDefinition: true,
          },
          // Also require docs on exported TS types, interfaces, and enums.
          contexts: [
            "TSInterfaceDeclaration",
            "TSTypeAliasDeclaration",
            "TSEnumDeclaration",
          ],
          // Enforce on all declarations, not just exported ones — internal logic also benefits.
          publicOnly: false,
        },
      ],
    },
  },
  {
    // Relax quality limits in scripts/ — these are one-off utilities and debug tools,
    // not production code paths. Core safety rules (types, async, imports) still apply.
    files: [
      "scripts/**/*.{js,mjs,cjs,ts,mts,cts}",
      "src/scripts/**/*.{js,mjs,cjs,ts,mts,cts}",
    ],
    rules: {
      "max-lines-per-function": "off",
      "max-lines": "off",
      complexity: "off",
      "max-params": "off",
      "max-depth": "off",
      "jsdoc/require-jsdoc": "off",
    },
  },
  {
    // Re-enable the built-in unused-vars rule for plain JS files
    // (TS files use @typescript-eslint/no-unused-vars instead).
    // Mirrors the same _ prefix ignore strategy for consistency.
    files: ["**/*.{js,mjs,cjs}"],
    rules: {
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    // Disable all ESLint rules that conflict with Prettier's formatting decisions.
    // This must be the last config block so it wins over all earlier rule definitions.
    ...eslintConfigPrettier,
  },
];
