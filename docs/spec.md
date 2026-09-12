# SSH Tool Contract

The host registers one tool through `defineTool`. Transport uses the public subprocess service and trusted local OpenSSH configuration with strict host-key checks. A bounded JSON protocol invokes remote Python 3. Read/write operations are UTF-8 and revision checked. Remote shell execution is separately authorized and is not root-confined. Host approval is required outside full-access mode for mutations; read-only policy denies them. Credentials remain in the SSH agent or OpenSSH configuration. No host source patch is required.
