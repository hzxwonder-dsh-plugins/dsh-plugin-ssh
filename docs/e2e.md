# SSH Verification Scenarios

1. Install in a clean Harness Web profile; verify the `ssh` schema appears in a new session.
2. Discover configured literal aliases; confirm wildcard aliases are omitted.
3. Probe an authorized host with trusted keys and Python 3. List and read a disposable remote root.
4. Approve a create with `baseRevision: missing`; read and update with the returned revision. Reject stale revisions, traversal, symlink and reserved lock paths.
5. Run a harmless command returning a nonzero exit code and verify output and status. Test timeout and cancellation, then inspect remote state.
6. Reject write/exec in read-only mode and without a working approval service. Test a rejected approval.
7. In the Harness Web composer, type `/ssh` and verify the command appears in discovery with the `<host> <absolute-remote-root>` hint.
8. Run `/ssh <host> <absolute-remote-root>` against a configured test alias and verify the read-only probe result lists host, resolved root, platform and Python version.
9. Run `/ssh` or `/ssh help` and verify usage is returned; invalid relative roots are rejected before any SSH process starts.
10. Confirm the command reports that it does not create a transparent Harness workspace and that subsequent remote work still uses explicit `ssh` tool arguments.

`npm test` executes protocol and adapter fixtures. A live authenticated SSH run is a separate integration check, requiring a user-authorized target.
