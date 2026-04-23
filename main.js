function main() {
  const lock = LockService.getScriptLock();
  // 优化：延长锁等待时间至 30 秒
  if (!lock.tryLock(30000)) {
    console.log("另一个实例正在运行中，本次退出。");
    return;
  }

  try {
    console.log("Bot 启动：正在扫描邮件...");
    const threads = GmailApp.search(SEARCH_QUERY, 0, 15); 
    
    if (threads.length === 0) {
      console.log("未发现新邮件。");
      return;
    }

    const now = new Date();

    threads.forEach((thread, index) => {
      if (index > 0) Utilities.sleep(5000);

      // 修复 1：获取该对话线索中的【最新一封】邮件
      const messages = thread.getMessages();
      const message  = messages[messages.length - 1]; 

      const subject   = message.getSubject();
      const emailBody = message.getPlainBody().substring(0, 8000); 
      console.log("正在解析: " + subject);

      // 修复 2：统一使用 thread.markRead() 标记整个线索已读
      if (!/\d{1,2}月\d{1,2}日/.test(emailBody)) {
        console.log("跳过：正文未检测到日期关键词。");
        thread.markRead(); 
        thread.moveToArchive();
        return;
      }
      
      thread.markRead(); 
      
      const scheduleData = callGemini(emailBody);
      
      if (scheduleData === null) {
        sendTextMessage("⚠️ 错误：解析 " + subject + " 失败，请检查。");
        console.error("⚠️ AI 解析失败: " + subject);
        
        const errorLabel = GmailApp.getUserLabelByName("AI解析失败") || GmailApp.createLabel("AI解析失败");
        thread.addLabel(errorLabel);
        thread.moveToArchive(); 
        return; 
      }

      if (scheduleData.has_schedule && scheduleData.events && scheduleData.events.length > 0) {
        let headerText = "📅 收到新日程";
        if      (scheduleData.attendance_type === "SELECT_ONE")   headerText = "🙋 【可选场次（择一参加）】";
        else if (scheduleData.attendance_type === "ALL_REQUIRED") headerText = "⚠️ 【重要：全日程参加必须】";

        const info = `\n[#${index + 1}] ${headerText}\n来源：${subject}\n备注：${scheduleData.attendance_note || "无"}`;
        sendTextMessage(info);
        Utilities.sleep(3000); 

        let sentCount = 0;
        scheduleData.events.forEach((event) => {
          if (!event || !event.start) return;

          const eventDate = new Date(event.start.replace(/-/g, "/"));
          if (eventDate < now) {
            console.log("⏩ 跳过过期日程: " + event.title);
            return;
          }

          if (sentCount > 0 || index > 0) {
            Utilities.sleep(3000);
          }

          const uniqueId = "card_" + Date.now() + "_" + Math.floor(Math.random()*1000);
          sendInteractiveCard(event, "🤖 助理小助手", uniqueId);
          sentCount++;
        });

        console.log(`✅ 解析成功。发送卡片数: ${sentCount}`);
      } else {
        console.log("ℹ️ 确认无明确未来日程。");
      }

      // 处理完毕，彻底移出收件箱
      thread.moveToArchive();
      console.log("📥 处理完成并归档。");
    });

  } finally {
    lock.releaseLock();
  }
}
