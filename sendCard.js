function sendInteractiveCard(event, cardLabel, uniqueId) {
  const startStr = event.start || "";
  let endStr = event.end; 
  
  // 1. 补全结束时间
  if (!endStr && startStr) {
    const d = new Date(startStr.replace(/-/g, "/"));
    d.setHours(d.getHours() + 1);
    endStr = Utilities.formatDate(d, "GMT+9", "yyyy-MM-dd HH:mm");
  }

  // 2. 格式化工具：生成日历链接
  const formatForCal = (str) => {
    if (!str) return "";
    const num = str.replace(/\D/g, "");
    return num.substring(0, 8) + "T" + num.substring(8, 12) + "00";
  };

  // 构造日历备注详情 (Details)
  let detailText = "";
  if (event.meeting_info) detailText += "▶ 会议信息: " + event.meeting_info + "\n";
  if (event.reservation_link) detailText += "▶ 预约链接: " + event.reservation_link + "\n";
  
  const calendarLink = `https://www.google.com/calendar/event?action=TEMPLATE` +
    `&text=${encodeURIComponent(event.title)}` +
    `&dates=${formatForCal(startStr)}/${formatForCal(endStr)}` +
    `&location=${encodeURIComponent(event.location || "见正文")}` +
    `&details=${encodeURIComponent(detailText)}` +
    `&ctz=Asia/Tokyo`;

  // 3. 时间显示逻辑 (同一天精简)
  let displayTime = startStr;
  if (endStr) {
    const sP = startStr.split(" ");
    const eP = endStr.split(" ");
    displayTime += (sP[0] === eP[0]) ? ` ~ ${eP[1]}` : ` ~ ${endStr}`;
  }

  // 4. 构建卡片组件 (Widgets)
 const widgets = [
    { 
      "decoratedText": { 
        "topLabel": "时间段", 
        "text": displayTime, 
        "startIcon": { "materialIcon": { "name": "schedule" } } // 替换为 Material 图标
      } 
    }
  ];

  // 地点栏位
  const locText = event.location || (event.meeting_info ? "线上会议" : "见邮件正文");
  widgets.push({ 
    "decoratedText": { 
      "topLabel": "地点/形式", 
      "text": locText, 
      "startIcon": { "materialIcon": { "name": "place" } } // 使用 'place' 或 'location_on'
    } 
  });

  // 会议信息栏位
  if (event.meeting_info) {
    widgets.push({
      "decoratedText": {
        "topLabel": "会议信息",
        "text": event.meeting_info,
        "startIcon": { "materialIcon": { "name": "videocam" } }, // 使用视频图标
        "wrapText": true 
      }
    });
  }
  
  // 5. 按钮逻辑
  const actionButtons = [];

  // 如果有预约链接，显示为首个按钮
  if (event.reservation_link) {
    actionButtons.push({
      "text": "🔗 点击进行预约/确认",
      "onClick": { "openLink": { "url": event.reservation_link } }
    });
  }

  // 添加到日历按钮
  actionButtons.push({
    "text": "📅 添加到日历",
    "onClick": { "openLink": { "url": calendarLink } }
  });

  // 统一加入按钮列表
  widgets.push({ "buttonList": { "buttons": actionButtons } });

  const payload = {
    "cardsV2": [{
      "cardId": uniqueId,
      "card": {
        "header": { 
          "title": cardLabel, 
          "subtitle": event.title, 
          "imageUrl": "https://www.gstatic.com/images/branding/product/1x/calendar_2020q4_48dp.png" 
        },
        "sections": [{ "widgets": widgets }]
      }
    }]
  };

  try {
    UrlFetchApp.fetch(CHAT_WEBHOOK_URL, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (e) { console.error("卡片发送失败: " + e); }
}