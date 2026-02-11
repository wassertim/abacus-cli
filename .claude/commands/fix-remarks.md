---
description: Fix PR review comments - specify "all remarks" or a specific remark like "1. variable naming"
argument-hint: <all remarks | specific remark description>
allowed-tools: Bash(gh:*), Bash(npm:*)
---

Fix PR review remarks based on the user's request: **$ARGUMENTS**

## Instructions

1. **Fetch PR info and review comments**:

   ```bash
   # Get PR number and repo info
   gh pr view --json number,headRefOid,headRepository --jq '{pr: .number, commit: .headRefOid, repo: .headRepository.name, owner: .headRepository.owner.login}'

   # Then fetch comments using the owner/repo from above
   gh api repos/{owner}/{repo}/pulls/{pr_number}/comments --jq '.[] | {id, path, line: .original_line, body}'
   ```

   **Important**: Use the `owner` and `repo` values from the first command in the API call. Do not hardcode repository names.

2. **Parse and understand** each review comment:
   - `id`: needed to reply to the comment thread later
   - `path`: file to modify
   - `line`: line number referenced
   - `body`: what the reviewer is asking for

3. **Determine scope** from the user's argument:
   - If "$ARGUMENTS" contains "all" → fix ALL review comments
   - Otherwise → find the specific remark that matches "$ARGUMENTS" and fix only that one

4. **For each remark to fix**:
   - Read the relevant file(s)
   - Understand the context around the commented line
   - Implement the fix according to the reviewer's feedback
   - Verify the fix doesn't break anything:
     ```bash
     npm run build 2>&1 | head -100
     ```

5. **After fixing, commit the changes** (do NOT push yet)

6. **Report** what was fixed and any remarks that couldn't be addressed automatically (e.g., clarification needed from reviewer)

7. **Remind the user**: After they push, run `/review` to verify fixes and update the review status

## Matching Specific Remarks

When user specifies a specific remark (not "all"), match by:

- Number prefix (e.g., "1.", "2.")
- Keywords in the comment
- File name mentioned
- Partial description

Be flexible in matching - the user might paraphrase the remark.
