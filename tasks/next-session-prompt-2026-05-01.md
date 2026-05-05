# Next Session Prompt - 2026-05-01

```text
We are in D:\Websites\padelsquash.

Read these first:
- AGENTS.md
- README.md
- tasks/lessons.md
- tasks/todo.md
- tasks/handoff-2026-05-01-booking-admin-review.md
- tasks/citysquash-comparison-todo-2026-05-01.md

Context:
Today we hardened the booking system and simplified the admin dashboard. Do not redo that work unless reviewing it. Current next goal is public website redesign planning/implementation based on CitySquash comparison.

Task:
Start Phase 1 from tasks/citysquash-comparison-todo-2026-05-01.md:
1. Review current homepage (`app/page-variation-a.tsx`, styles, content files).
2. Design a simpler CitySquash-inspired public structure:
   - neutral/simple colors,
   - real photo-led blocks,
   - less decorative motion/gradients,
   - direct offer-led sections.
3. Implement a preview route first, not replacing `/` yet:
   - `/preview/citysquash-style`
4. Include at least:
   - hero with real/managed-image-ready photo,
   - booking CTA,
   - first session / intro block,
   - group events block,
   - corporate block,
   - prices summary,
   - gallery block,
   - contact/directions block.
5. Do not copy CitySquash text/images. Use original Russian copy for our club.
6. Keep changes minimal and consistent with the existing Next.js App Router project.
7. Before coding, write/update `tasks/todo.md` with a clear plan.
8. After coding, run verification (`npm run lint`, `npm run build`; targeted tests if logic changes) and record results in `tasks/todo.md`.

Important:
- The user wants visual similarity in simplicity and block structure, not a clone.
- Current site has placeholder `picsum.photos`; media management is a follow-up unless you choose to implement it first.
- There is already an instructor-only upload endpoint at `app/api/admin/upload/route.ts`; general media/gallery management is not built yet.
- Do not start by replacing the main homepage. Build a preview route first for review.
```
