---
name: safe_file_editing
description: Rule strictly forbidding the use of bash/powershell scripts for modifying code files.
---

# Safe File Editing Rule

You are **STRICTLY FORBIDDEN** from using terminal scripts (via the `run_command` tool) to edit or modify file contents. 
This includes, but is not limited to:
- PowerShell `-replace`
- Unix `sed`, `awk`, or `perl` scripts
- `echo` or `cat` redirects (`>`) to modify existing code files.

## Required Behavior
When you need to modify one or more files, you MUST use the provided safe file-editing tools:
- `replace_file_content`
- `multi_replace_file_content`

Even if the user asks you to "optimize all screens" or edit many files at once, you must edit them individually using the designated tool calls, or ask the user which files they want to prioritize if there are too many to edit manually in one go. Never resort to script-based mass replacements.
