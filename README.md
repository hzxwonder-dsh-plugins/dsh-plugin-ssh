# DSH SSH 插件

[English](README.en.md)

为 DeepSeek Harness Desktop 提供 SSH 连接管理、远程工作区、目录选择和远程文件操作。连接设置、会话输入区和右侧文件面板共享当前远程项目。

## 宿主支持

本仓库维护 [DeepSeek 官方 Desktop](https://github.com/deepseek-ai/deepseek-harness) 的独立适配插件。
[DSH Omni](https://github.com/hzxwonder/dsh-omni) 的集成版由其 `vendor/` 单独维护。维护目标为这两个桌面产品，Web 端不再作为维护目标。

### 官方 Desktop 验收

2026-09-26，macOS arm64，官方签名的 DeepSeek Harness **0.1.7-rc.2**，通过应用插件管理页安装公开版本 **0.1.0**：可安装，Host 显示运行；冷启动失败：客户端等待 settingsScope。当前公开版尚未兼容。

官方有 ssh/fs-ssh/subprocess-ssh/sandbox-ssh 远程执行提供方；本插件增加连接管理、远程目录选择与会话工作区 UI。

[完整验收与官方功能对照](https://github.com/hzxwonder/dsh-omni/blob/main/docs/official-desktop-compatibility.md)。安装成功、组件运行与核心功能验收是不同阶段；兼容范围以实机报告为准。

开发与发布顺序：DSH Omni 开发及实机验收 → 更新 Omni 仓库 → 官方 Desktop 适配及实机验收 → 发布本仓库。每次重新构建后重新实机验证。

### 安装到官方 Desktop

在官方应用中打开“插件 → 添加插件”，输入 `https://github.com/hzxwonder-dsh-plugins/dsh-plugin-ssh`。安装器通过兼容性检查后再启用；按照上面的验收状态决定是否在日常配置使用。

## 安装

需要 Node.js 22.19+、本机 OpenSSH 和远端 Python 3。安装与启动使用同一个 DSH_HOME：

~~~sh
git clone https://github.com/hzxwonder-dsh-plugins/dsh-plugin-ssh.git
cd dsh-plugin-ssh
npm ci
dsh plugin --profile migration add "file:$PWD"
~~~

保留 file: 前缀以安装依赖。安装或修改插件后重启 Harness，连接设置即时保存。首次连接前，在系统终端确认主机指纹并建立可信的 known_hosts 记录。

## 连接管理

打开「设置 → SSH连接」，添加连接或点击「导入」。导入会列出 ~/.ssh/config 及有限深度 Include 中的具体别名，勾选后添加；已有连接的名称和设置会保留。加载失败时显示错误并支持重试。

![SSH 连接设置](docs/screenshots/ssh-settings.png)

![选择导入连接](docs/screenshots/ssh-import.png)

连接表单支持名称、主机、用户名、端口、SSH agent、身份文件和密码认证。高级设置包含默认目录、跳板机、超时和保活，默认目录支持 ~ 或绝对路径。

密码仅在设置表单输入。未勾选记住时保存在当前进程内存；勾选后由 Harness 本机凭据服务保存。连接设置和工具结果不包含密码值。

![添加 SSH 连接](docs/screenshots/ssh-add-connection.png)

## 远程工作区与会话

点击「添加工作区 → 远程工作区」，选择连接，再浏览远程目录。目录选择器支持输入路径、返回上一级、刷新、搜索和显示隐藏目录。点击「使用此目录」后创建工作区及会话；后续在该工作区新建的会话会继承远程目标，刷新页面后仍保留。

![远程目录选择](docs/screenshots/remote-directory.png)

![远程工作区](docs/screenshots/remote-workspace.png)

在已有会话输入 `/ssh` 并按 Enter，即可打开相同的连接与目录选择器。选定后，远程目录会作为 PI-Desktop 风格的内联引用标签插入 prompt 正文；点击标签可重新选择，解除绑定仅影响当前会话。

![会话远程目录](docs/screenshots/remote-composer.png)

模型通过 ssh 工具访问远程文件和运行命令。交互式 shell 由 [终端插件](https://github.com/hzxwonder-dsh-plugins/dsh-plugin-terminal) 提供。普通本机文件和 shell 工具仍作用于本机，远程目标不会自动重定向它们。

## 工具与命令

| 操作 | 功能 |
| --- | --- |
| connections、import、save_connection、remove_connection | 查询、导入、保存和删除连接 |
| connect、probe、hosts | 连接探测与主机查询 |
| setTarget、getTarget、clearTarget、projects | 会话远程目标与项目历史 |
| listFiles / list、readFile / read、write | 远程目录和文件 |
| exec | 远程命令、退出码和有界输出 |
| passwordStatus | 查询密码是否已配置 |

使用 connectionId 或 target: {connectionId, path} 指定连接，省略连接选择器时使用当前会话目标。文件路径相对于 root，文本上限为 64 KiB。写入前读取 revision，更新时传入 baseRevision，新建文件使用 "missing"。

~~~json
{"action":"readFile","connectionId":"dev","root":"/srv/project","path":"README.md"}
~~~

带参数的命令也可直接使用：

~~~text
/ssh list
/ssh import
/ssh connect <connection-id> [~|/absolute/root]
/ssh <host> <absolute-remote-root>
~~~

连接命令会验证远程目录；使用已保存连接时可绑定当前会话。命令和模型工具中的变更遵循 Harness 的 sandbox/approval 策略。

## 权限与运行边界

OpenSSH 严格检查主机密钥。文件操作限制在选定 root 内，拒绝路径穿越、符号链接、硬链接和保留锁路径，写入采用 revision 校验与原子替换。目录选择器允许主动切换 root；远程命令以远端账户权限运行，root 是工作目录。

只读模式阻止配置变更、目标绑定、写文件及远程命令。Web 操作通过已认证的 Harness 连接处理，模型发起的受限变更另需审批。超时或断线可能留下未知的远端结果，重试写入前先读取确认。

## 验证与开发

~~~sh
npm test
~~~

测试覆盖 OpenSSH 导入、认证传递、文件协议与安全边界、Web 路由、工作区继承和解除绑定。截图来自本机运行的 Harness Web 与 Chrome，远程列表使用合成数据。真实服务器认证需按 [验收说明](docs/e2e.md) 单独验证。

- [接口与存储契约](docs/spec.md)
- [截图来源](docs/screenshots/SOURCES.md)

LGPL-3.0-only。实现参考 PI-Desktop 的远程工作区交互，并使用 DeepSeek Harness 官方服务；归属见 [NOTICE](NOTICE)。
