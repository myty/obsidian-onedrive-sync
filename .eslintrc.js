module.exports = {
    extends: ["plugin:prettier/recommended"],
    env: {
        es6: true,
        node: true,
        browser: true,
    },
    parserOptions: {
        ecmaVersion: 8,
        sourceType: "module",
        ecmaFeatures: {
            jsx: true,
        },
    },
    ignorePatterns: ["/node_modules/**", "/build/**", "*.js"],
    rules: {
        "no-unused-vars": [
            "warn",
            { args: "none", argsIgnorePattern: "req|res|next|val" },
        ],
        "prettier/prettier": ["error"],
    },
};
