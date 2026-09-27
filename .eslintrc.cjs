module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } },
  plugins: ["@typescript-eslint", "react-hooks"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
  ],
  rules: {
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "no-restricted-globals": ["error", { name: "confirm", message: "useConfirm() 를 쓰세요 (iOS PWA 에서 window.confirm 이 막힙니다)" }],
  },
  overrides: [
    { files: ["tools/**/*.mjs", "e2e/**/*.ts", "*.config.ts"], env: { node: true } },
  ],
  ignorePatterns: ["dist", "node_modules", "*.cjs", "e2e/vendor"],
};
