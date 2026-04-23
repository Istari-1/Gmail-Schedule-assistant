

function shadowForwarder() {
  const lock = LockService.getScriptLock();
  // 增加锁定时间到 30 秒，防止前后两个分钟的触发器打架
  if (!lock.tryLock(30000)) return;

  try {
    // 1. 切断套娃
    const query = `label:"${LABEL_WAITING}" -from:me`;
    const threads = GmailApp.search(query, 0, 20);

    const labelWaiting = GmailApp.getUserLabelByName(LABEL_WAITING);
    const labelDone    = GmailApp.getUserLabelByName(LABEL_DONE) || GmailApp.createLabel(LABEL_DONE);

    if (threads.length === 0 || !labelWaiting) {
      console.log("没有发现待处理的标签。");
      return;
    }

    threads.forEach((thread, index) => {
      // --- 【关键修改 1：残留清理】 ---
      // 获取当前线程的所有标签。如果已经有“已中转”，说明上次 removeLabel 失败了
      const currentLabels = thread.getLabels().map(l => l.getName());
      if (currentLabels.includes(LABEL_DONE)) {
        thread.removeLabel(labelWaiting);
        console.log("⚠️ 发现残留标签，已补救移除，跳过转发。");
        return; 
      }

      if (index > 0) Utilities.sleep(2000);

      const messages = thread.getMessages();
      let combinedBody = "";
      messages.forEach((m, i) => {
        combinedBody += `\n--- 消息 [${i+1}] 来自: ${m.getFrom()} ---\n${m.getPlainBody()}\n`;
      });

      if (combinedBody.length > MAX_BODY_CHARS) {
        combinedBody = combinedBody.substring(0, MAX_BODY_CHARS) + "\n...[Too Long]...";
      }

      try {
        MailApp.sendEmail({
          to: BOT_EMAIL,
          subject: "[TRANS] " + thread.getFirstMessageSubject(),
          body: combinedBody
        });

        // --- 【关键修改 2：原子操作顺序】 ---
        thread.addLabel(labelDone);      // 1. 先贴完成标签
        thread.removeLabel(labelWaiting); // 2. 再删待中转标签
        
        // --- 【关键修改 3：强制刷新】 ---
        // 告诉 Google 服务器：我现在就要更新这个线程的状态，别等缓存了
        GmailApp.refreshThread(thread); 
        
        console.log("✅ 成功移交给 Bot 并清理标签: " + thread.getFirstMessageSubject());
      } catch (e) {
        console.error("❌ 转发失败: " + e.message);
      }
    });
  } finally {
    lock.releaseLock();
  }
}





 
// const query = 'in:inbox -from:me {講座 開催 予約 申込 リマインド セミナー} -label:' + labelName + ' newer_than:1d';

// function shadowForwarder() {
  
//   const labelName = "已中转";
//   const query = 'in:inbox -from:me {講座 開催 予約 申込 リマインド セミナー} -label:' + labelName + ' newer_than:1d';
  
//   const threads = GmailApp.search(query);

//   let label = GmailApp.getUserLabelByName(labelName);
//   if (!label) label = GmailApp.createLabel(labelName);

//   // 依然排除掉“已中转”标签，防止重复发送
//  // 核心改动：加入了 -from:me
// // 这样脚本只会搜索“别人发给你的”邮件，而永远忽略“你自己发出的”转发件


//   threads.forEach(thread => {
//     const messages = thread.getMessages();
//     const msg = messages[messages.length - 1]; 
    
//     const subject = msg.getSubject();
//     const body = msg.getPlainBody();
    
//     try {
//       MailApp.sendEmail({
//         to: BOT_EMAIL,
//         subject: "[TRANS] " + subject,
//         body: "--- 原始发件人: " + msg.getFrom() + " ---\n\n" + body
//       });

//       // 仅仅贴上标签，用于脚本自己识别“这一封我已经复印过了”
//       thread.addLabel(label);
      
//       // --- 下面这两行已经删掉或注释掉，以保持邮件原有状态 ---
//       // thread.markRead(); 
//       // thread.moveToArchive(); 
      
//       console.log("✅ 成功中转（保持原样）: " + subject);
//     } catch (e) {
//       console.error("❌ 中转失败: " + e.message);
//     }
//   });
// }

