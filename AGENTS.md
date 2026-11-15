# Code readability

Write clearly structured code with consistent indentation, spaces around operators,
and line breaks between logical sections. Expand multi-step handlers and nested
conditions instead of compressing them onto one line.

Run `npm run format -- <files>` on modified source and configuration files before
committing; use `npm run format:check -- <files>` to verify formatting. Review the formatted diff for readability and unused code.
Preserve existing behavior during formatting-only changes.
