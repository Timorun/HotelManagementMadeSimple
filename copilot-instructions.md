---
description: "Workspace guidance for HotelManagementMadeSimple: prefer source code, avoid generated output, and keep Copilot suggestions focused."
applyTo:
  - "**/*"
---

- Focus on source code under `backend/hmms/src`, `frontend/hmms/src`, and repository-level configuration files.
- Do not modify generated or build output directories such as `backend/hmms/target`, `frontend/hmms/node_modules`, `.idea`, or `.git`.
- Prefer small, targeted changes rather than broad refactors unless explicitly requested.
- When suggesting improvements, mention workspace-level settings that reduce indexing and watcher load.
- Keep task execution efficient and avoid opening or scanning unnecessary large directories.
