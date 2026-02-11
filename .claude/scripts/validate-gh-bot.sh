#!/bin/bash
# PreToolUse hook: blocks bare `gh` commands that bypass .claude/scripts/gh-bot wrapper.
# Exit 0 = allow, Exit 2 = block (stderr fed back to agent as error).

INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

# Allow if not a gh command at all
if ! echo "$CMD" | grep -qE '(^|\s|;|\||&&)gh\s'; then
  exit 0
fi

# Allow if using the gh-bot wrapper
if echo "$CMD" | grep -q 'gh-bot'; then
  exit 0
fi

echo "Blocked: Use .claude/scripts/gh-bot instead of bare 'gh' commands. The wrapper ensures reviews are posted from the bot account." >&2
exit 2
