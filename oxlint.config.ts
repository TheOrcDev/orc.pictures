import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import { jsPluginSettings, selectJsPlugins } from "ultracite/oxlint/js-plugins";
import next from "ultracite/oxlint/next";
import nextJsPlugins from "ultracite/oxlint/next/js-plugins";
import react from "ultracite/oxlint/react";

const jsPlugins = selectJsPlugins(["react-doctor"]);

export default defineConfig({
  extends: [core, react, next, nextJsPlugins, antiSlop, jsPlugins],
  ignorePatterns: [
    ...(core.ignorePatterns ?? []),
    "**/.agents",
    "**/scripts",
    "**/raycast/**",
  ],
  jsPlugins: jsPlugins.jsPlugins,
  overrides: [
    {
      files: ["components/ui/**"],
      rules: {
        "anti-slop/require-safety-comment-for-type-assertion": "off",
        "eslint/arrow-body-style": "off",
        "eslint/eqeqeq": "off",
        "eslint/func-style": "off",
        "eslint/sort-keys": "off",
        "import/consistent-type-specifier-style": "off",
        "jsx-a11y/click-events-have-key-events": "off",
        "jsx-a11y/label-has-associated-control": "off",
        "jsx-a11y/no-noninteractive-element-interactions": "off",
        "jsx-a11y/prefer-tag-over-role": "off",
        "react-doctor/no-array-index-as-key": "off",
        "react-doctor/only-export-components": "off",
        "react-doctor/react-compiler-no-manual-memoization": "off",
        "react/function-component-definition": "off",
        "react/no-object-type-as-default-prop": "off",
        "react/todo": "off",
        "typescript/array-type": "off",
      },
    },
  ],
  settings: jsPluginSettings,
});
