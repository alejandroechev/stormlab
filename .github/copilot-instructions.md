# Code implentation flow

1. create a new repo if there is no git repo
2. create a new branch
3. create a git worktree to work on the feature described
4. use Typescript as default language, unless told otherwise
5. work using TDD with red/green flow ALWAYS
6. separate domain logic from CLI/UI/WebAPI, unless told otherwise
7. evert UI/WebAPI feature should have parity with a CLI way of testing that feature
8. <important> Always commit after you finish your work with a message that explain both what is done, the context and a trail of the though process you made</important>
9. before commiting: run all new unit tests, validate coverage is over 90%, use cli to test new feature. if any of this fail, fix the issues
10. include as part of every commit, update documentation for the project/feature
11. after committing: run Playwright browser-based validation against the running dev server (npm run dev on http://localhost:1420/) to manually verify all new and existing UI features work end-to-end. Take screenshots as evidence and save them to the `screenshots/` folder (gitignored) to avoid polluting the repo. Validate: rendering, selection, drag, delete, connect, inline edit, pan/zoom, multi-tab, stencil palette, and any newly added features.
