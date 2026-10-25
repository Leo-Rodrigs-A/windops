# Working on Wind Ops

Read .agent/architeture.md and .agent/memory.md before changes. Follow .agent/tasks/README.md: .agent/tasks/roadmap contains the original product roadmap, while numbered slice folders contain executable task plans. Pick the relevant task, respect its dependencies, and update its checkboxes, slice index and evidence when finished. Writing a plan does not complete implementation. Create detailed tasks progressively, not the entire backlog at once.

- Keep the modular monolith. Modules call public services; do not import another module's schema or repositories.
- Tenant authorization is mandatory even with the one-workspace pilot limit.
- Never expose Electric directly or trust client-provided table/where filters.
- Do not call optimistic memory state durable persistence. Test restart, retry and conflict behavior in offline slices.
- Do not enable Better Auth routes before mandatory email second-step and verified account-linking tests pass.
- Use pnpm check for source changes and integration/container checks when infrastructure changes.
- Pencil/pen.dev .pen files belong to the owner and stay in a local Windows folder outside this repository; never commit them. Read them through the Windows app's MCP as development references only. Confirm the intended document before using it; do not invent final layouts when references are unavailable or edit the designs without an explicit request.
- Keep secrets out of source, images, logs and VITE_ variables.
- Distinguish implemented behavior from planned dependencies and document unavailable validation honestly.
