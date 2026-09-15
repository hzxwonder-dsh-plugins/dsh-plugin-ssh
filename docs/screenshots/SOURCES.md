# 截图来源

README 中的图片由插件集合中的 tests/web-check.mjs 生成：本机 Chrome 运行实际 Harness Web，使用临时配置和合成连接数据。截图不包含凭据。

| 文件 | 页面与验证内容 |
| --- | --- |
| ssh-settings.png | 浅色 SSH 连接列表及保存结果 |
| ssh-import.png | 勾选 OpenSSH 别名导入 |
| ssh-add-connection.png | 浅色添加连接表单 |
| ssh-settings-dark.png | 深色连接列表 |
| ssh-add-dark.png | 深色添加连接表单 |
| ssh-add-narrow.png | 390px 窄屏表单 |
| remote-directory.png | 远程目录选择器 |
| remote-composer.png | 当前会话的远程主机与目录 |
| remote-workspace.png | 远程工作区及刷新后的目标继承 |
| remote-project.png | 右侧 SSH 文件面板 |
| composer-local-light.png | 右侧栏展开时的输入工具栏 |
| composer-dark.png | 深色输入框与远程目录按钮 |
| composer-desktop.png / composer-detail.png | 1040px 页面及输入区细节 |
| composer-narrow.png | 390px 宽度的输入工具栏 |
| composer-long-directory.png | 长目录名的省略显示 |

页面由真实的插件客户端渲染；fixture-dev 等主机及 /home/demo 下的目录是受控测试数据。截图证明界面布局、交互和状态保存，真实服务器认证需按 [验收说明](../e2e.md) 单独检查。界面文本会随 Harness 的语言设置显示。

remote-terminal.png 为 PI-Desktop 的独立参考资产，来源是 docs/workbench-ssh/panel-evidence/panel-terminal-dark.png；它用于交互研究，当前 README 使用上表的 Harness Web 截图。
