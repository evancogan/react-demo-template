# React Demo Template

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black) ![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white) ![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white) ![Vitest](https://img.shields.io/badge/Vitest-5-6E9F18?logo=vitest&logoColor=white) ![Node](https://img.shields.io/badge/Node.js-24-339933?logo=nodedotjs&logoColor=white) [![Use this template](https://img.shields.io/badge/use%20this-template-2ea44f?logo=github)](https://github.com/evancogan/react-demo-template/generate)

[![CI](https://github.com/evancogan/react-demo-template/actions/workflows/ci.yml/badge.svg)](https://github.com/evancogan/react-demo-template/actions/workflows/ci.yml)

The starting point for my React + TypeScript demo projects. Every new demo (an online storefront, a business landing page, an admin dashboard) is created from this repo, so it starts with the same setup, checks and workflow from its first commit.

## How changes get in

- Every change is small and starts as an issue that says what "done" means.
- Every change goes through a pull request on its own branch.
- CI runs lint, tests and a build on every pull request. Nothing merges unless it passes.
- I read every diff before merging, whether I wrote it or an AI agent did.

## Status

The app skeleton, CI, and the agent workflow (templates, AGENTS.md, decision records, run log, agent account) are all done now. The next step is building the three demo apps from this template.

## Agent workspace

This repo is cloned into the agent's VM at `C:\Repos\react-demo-template` as its workspace. The repo owner does not work in that clone directly; all changes are made through pull requests.
