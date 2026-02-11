---
description: Review PR code changes and post review to GitHub
---

Use the code-reviewer agent to review the current PR.

**Prerequisites**: Ensure `GH_BOT_TOKEN` environment variable is set. The agent will exit with an error if authentication fails.

The agent will:

1. Verify GitHub authentication works (exits with error if `GH_BOT_TOKEN` not set)
2. Check if there's an existing CHANGES_REQUESTED review (re-review vs fresh review)
3. Analyze the diff against project guidelines
4. Run `npm run build` to check for compilation errors
5. Post the review directly to GitHub with line-specific comments
6. Approve if no issues, or REQUEST_CHANGES with remarks

**Reference**: All review criteria are documented in CLAUDE.md and the code-reviewer agent definition.
