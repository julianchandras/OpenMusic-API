import globals from "globals";
import js from "@eslint/js";
import eslintConfigAirbnb from "eslint-config-airbnb-base";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat();

export default [
  js.configs.recommended,
  ...compat.config(eslintConfigAirbnb),
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "module",
      ecmaVersion: 2022,
      globals: {
        ...globals.node
      },
    },
    rules: {
      "no-underscore-dangle": "off",
    },
  },
];
