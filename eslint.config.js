export default [
  {
    files: ["**/*.js", "**/*.cjs", "**/*.mjs"],
    extends: "eslint:recommended, prettier",
    env: {
      node: true,
      es6: true,
    },
    parserOptions: {
      ecmaVersion: 2021,
    },
    rules: {},
  },
]
