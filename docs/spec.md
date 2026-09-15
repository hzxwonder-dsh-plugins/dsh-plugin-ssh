# SSH Host and Web Contract

## Services and transport

The host registers the ssh tool, /ssh command, and sshWorkbench service. Operations use the official subprocess service, strict OpenSSH host-key checks, and a bounded Python 3 JSON protocol. Files are UTF-8 and revision checked; commands run with the remote account's permissions.

Connections support agent, identity-file, and password authentication. Passwords enter through authenticated Web settings and stay in process memory or the Harness credential provider. A request-scoped, one-use private Unix socket supplies askpass; passwords are absent from subprocess arguments and environment. Interactive PTYs belong to dsh-plugin-terminal.

## Settings and persistence

| Field in the ssh namespace | Meaning |
| --- | --- |
| connections | Connection metadata; no password values |
| targets | Explicit targets keyed by sessionId |
| projects | Recent remote targets |
| workspaces | {localPath, connectionId, path} mappings |
| detachedSessions | Sessions that opted out of workspace inheritance |

Connection edits use settings revisions. Target and workspace updates are serialized and mutate only their own fields. Lookup first respects explicit detach, then an explicit target, then the session's workspace mapping. Deleted connections invalidate target resolution.

prepareWorkspace probes the requested root and creates a canonical local metadata directory under $DSH_HOME/plugin-data/ssh/workspaces/<sha256(connectionId,path)>. Harness registers it through its official workspace service. This anchor does not mount or synchronize remote files. The system prompt directs the model to ssh and remote terminal tools; ordinary local tools retain local semantics.

## Web integration

The client registers the ssh-connections settings section and remote file Sidebar tab. Both conversation.hero.workspace.directoryFlow and sidebar.workspaces.directoryFlow present local/remote choices. Official workspaces, sessions, and uiWorkspace services create and open remote-project sessions. Bare /ssh opens the shared picker; a selected directory is inserted into the session prompt as a native reference chip through the scoped conversation input API.

Authenticated POST /api/dsh-ssh accepts bounded JSON, validates supplied session IDs, and enforces read-only policy. Actions include status, discover, selected import, browse, prepareWorkspace, password management, target binding, probe, list, read, and write.

Discovery reads bounded OpenSSH includes. Selected import validates requested aliases and preserves existing records. Browse returns sorted directories only; each requested directory becomes the listing root, allowing explicit parent navigation. File access remains confined to its selected root. Superseded requests cannot replace newer listings; selection commits only successfully loaded paths.

## Commands and tools

/ssh list lists connections, /ssh import imports aliases, and /ssh connect <id> [root] probes a saved connection and binds its verified directory to the current session. /ssh <host> <root> also probes; a matching saved connection can be bound. Host commands use the model action approval boundary. Bare /ssh in Web opens the connection picker.

Tools cover connection management, probes, commands, files, target management, and password-status inspection. Calls select connections by ID, explicit host, or target object; otherwise they inherit the session target. Imported aliases preserve OpenSSH configuration semantics; explicit connections isolate unrelated local configuration.

## Safety

File operations reject traversal, symlinks, hard-linked files, and reserved lock paths. Writes use an advisory root lock, revision checks, and atomic replacement. Read-only sessions deny mutations. Constrained model mutations require approval; Web interactions use the authenticated user connection. Transport interruption can leave a remote outcome unknown, so callers inspect before retrying.
