# Command: Implement a new feature

Use this flow every time you are about to implement a new feature.

## Mandatory steps

1. **Read the relevant module spec** in `.claude/specs/modules/`
2. **Read the data model** in `.claude/specs/data-model.md` to identify the entities involved
3. **Read the routes** in `.claude/specs/routes.md` to verify whether the route already exists or needs to be created
4. **Check out-of-scope** in `.claude/specs/out-of-scope.md` — if the feature is listed there, do not implement it
5. **Implement** following the conventions in `CLAUDE.md` and the architecture in `.claude/specs/architecture.md`
6. **If you add Prisma models:** update `.claude/specs/data-model.md`
7. **If you add routes:** update `.claude/specs/routes.md`

## Checklist before marking as complete

- [ ] Code follows project conventions (no DB fetch from client components)
- [ ] Images are uploaded to Cloudinary, not the local filesystem
- [ ] If the feature touches beta/studio data: verify only the author has access
- [ ] Server Actions validate that the authenticated user has permission over the resource
- [ ] Notifications are generated where applicable (see `.claude/specs/modules/notifications.md`)
- [ ] Tests are written and coverage stays at or above 80%