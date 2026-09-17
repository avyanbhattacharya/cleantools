---
render: true
title: Local AI Lab Workspace
description: Security boundary and browser capability limits for the Local AI Lab Workspace experiment.
route: /docs/architecture/workspace/
index: false
section: Technical documentation
---

# Local AI Lab Workspace

## Purpose

Workspace is an experimental, desktop-first Local AI Lab module. It provides a small browser-native command workspace for one folder selected explicitly by the visitor. It is not an unrestricted Unix terminal and does not run commands on the visitor's operating system.

## Folder and persistence boundary

The user chooses a directory using the browser's File System Access API. Workspace can access only that selected directory and its children. The browser may retain the directory handle in same-origin IndexedDB so a user can reopen the same workspace; the browser can require renewed permission at any time.

No other folders, installed applications, processes, browser credentials, or system settings are accessible. Disconnecting removes Workspace's saved handle only; it never changes user files.

## Command boundary

The initial command allowlist is `pwd`, `ls`, `cat`, `head`, `wc`, `find`, `mkdir`, `touch`, and `write`. It contains no deletion command, package manager, shell-script runner, host-process execution, compiler/runtime, or network command. Writes happen only after a user enters a supported write command for the selected folder.

There is no Homebrew, `curl`, `wget`, `ssh`, `sudo`, or arbitrary installation path. Future capability packs must be reviewed, browser-sandboxed, explicitly installed by the user, and must not widen folder or network permission.

## Privacy and compatibility

Workspace has no account, application backend, telemetry, cloud fallback, or working-file upload. It is useful only in browsers that support directory selection—current desktop Chrome and Edge are the intended initial target. Unsupported browsers, including many mobile browsers, must stop cleanly without requesting a folder or attempting a fallback.
