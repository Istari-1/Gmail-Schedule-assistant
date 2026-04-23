
# Gmail Calendar Bot
一个基于 Google Apps Script (GAS) 和 Gemini 1.5 Flash 的智能日程自动化助手。它能自动监控 Gmail 邮件，利用 AI 解析其中的日程信息，并同步到指定的 Google 日历中，同时向 Google Chat 发送美观的交互式卡片。

## 核心功能
1. 智能解析：利用 Gemini 提取邮件中的活动名称、开始/结束时间、地点及会议链接。

2. 自动同步：解析成功的日程将自动写入指定的 Google 日历，支持多场次解析。

3. 容错重试：内置 5 次指数退避重试机制，有效应对 API 频繁出现的 503 Service Unavailable 错误。

4. 安全脱敏：支持通过 GAS 脚本属性管理 API Key，避免敏感信息泄露。

5. 交互通知：向 Google Chat Webhook 发送卡片通知，支持直接点击按钮跳转预约链接或手动加日历。

6. 过期过滤：自动识别并跳过邮件中的过往日程，确保日历整洁。

## 技术栈
语言：Google Apps Script (JavaScript)

模型：Google Gemini 

集成服务：Gmail API, Calendar API, Google Chat Webhook

## 快速开始
1. 准备工作

- 获取 Gemini API Key。

- 创建一个 Google Chat 空间的 Webhook 地址（用于接收卡片消息）。

- 获取目标日历 ID（若使用主日历，填 primary 即可）。

2. 部署脚本
在 Google Apps Script 创建新项目。

- 将本项目中的 .js 文件内容复制到对应的 .gs 文件中。

- 点击左侧 “项目设置” (齿轮图标)，添加以下 “脚本属性”：

    1. ```GEMINI_API_KEY```: 你的 Gemini API Key

    2. ```CHAT_WEBHOOK```: 你的 Google Chat Webhook URL

    3. ```TARGET_CALENDAR_ID```: 接收日程的日历 ID（可选，默认为主日历）

3. 设置触发器
    点击左侧 “触发器” (闹钟图标)。

    添加触发器：选择 main 函数，部署为“时间驱动”，建议频率为 每 10 分钟一次。

## 📂 文件说明
```Main.js```: 主程序逻辑，负责邮件扫描、流程控制及日历写入调度。

```Gemini.js```: 核心 AI 处理模块，包含 Prompt 提示词工程及 503 重试机制。

```sendCard.js```: 负责构建并发送 Google Chat 交互式卡片。

```Config.js```: 全局常量定义及脚本属性读取。
```sendMessage.js```:负责在Google chat发送信息





# 📧 Gmail客户端设置说明
为了实现精准触发并防止死循环，我在 Gmail 端配置了两个互补的过滤器；同时为了标记是否中转设置了标签（label）```待中转```和```已中转```

## 1. 内部中转过滤
```匹配条件：subject:([TRANS]) from:me to.......@gmail.com```

>执行操作：跳过收件箱（归档）、标记为已读。

### 设计意图：

防止死循环：由于脚本会通过 sendTextMessage 等方式产生新邮件，。这个过滤器确保所有发往机器人邮箱、且带有 [TRANS] 标记的邮件不会再次触发脚本，直接存入库中。确保这些系统内部的指令邮件不会骚扰你的主收件箱。

## 2. 日程关键词过滤以及排除自己发送的邮件
 
```匹配条件：{試験 テスト ... 案内 说明会 ...} -from:me```
>执行此操作： 应用标签“待中转”

包含“考试、测试、演示、讲座、预约、面试、说明会”等 20 多个符合日本大学日程安排邮件的关键词。

### 注意

```-from:me```：这是一个关键的安全开关。它排除了你自己发送的邮件，防止脚本解析你发出去的回复或草稿形成循环。

