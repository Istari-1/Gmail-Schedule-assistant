function callGemini(emailBody) {
  console.log("--- [DEBUG] 开始调用 Gemini API ---");
  const currentYear = new Date().getFullYear();
  const currentTime = Utilities.formatDate(new Date(), "GMT+9", "yyyy-MM-dd HH:mm");
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${GEMINI_API_KEY}`;
  // 1. 限制长度，防止处理过慢或超时
  
  if (!emailBody || typeof emailBody !== 'string') {
    console.error("--- [DEBUG] 邮件正文无效，跳过解析 ---");
    return null;
  }
  const sanitizedBody = emailBody.substring(0, 3000); 
  
  const payload = {
    "contents": [{
      "parts": [{
        "text": `你是一个专业的日程解析助手。请根据邮件内容提取日程。

【核心约束】：
1. 今年是 ${currentYear} 年。若邮件未标年份，默认为 ${currentYear}。
2. 当前时间是：${currentTime}。**严禁提取早于此时间的日程**。
3. **多场次处理**：若邮件列出多个独立场次，请全部存入 "events" 数组。

【时间提取规则】：
1. 格式严格遵循：YYYY-MM-DD HH:mm。
2. **标准字段优先**：必须优先寻找“開催日”和“開催時間”标签。
3. **消除干扰**：若标题中包含冗余时间（如 14:20-15:50(14:20-15:00)），请忽略括号内的内容，仅提取“開催時間”指定的具体 14:20-15:00 区间。
4. **全角处理**：统一识别‘～’和‘~’为分隔符。

【地点与会议提取】：
1. location：优先写物理地址。若提及 Web 面谈/Zoom 等，写 "线上"。
2. 若地点包含“当日まで”、“別途”、“未定”或“※”，location 请统一写为 "待后续通知"。
3. meeting_info：提取会议号/链接。若无则**必须设为 null**。
4. reservation_link：提取预约/确认 URL。若无则**必须设为 null**。

【输出 JSON 格式】（仅返回纯 JSON，严禁 Markdown 代码块）：
{
  "has_schedule": true,
  "attendance_type": "SELECT_ONE | ALL_REQUIRED | NOT_SPECIFIED",
  "attendance_note": "一句话说明要求",
  "events": [
    {
      "title": "清洗后的事件名称",
      "start": "YYYY-MM-DD HH:mm",
      "end": "YYYY-MM-DD HH:mm 或 null",
      "location": "地址或'线上'或'待后续通知'",
      "meeting_info": "字符串或 null",
      "reservation_link": "URL 或 null"
    }
  ]
}

邮件内容：\n${sanitizedBody}`
      }]
    }],
    "generationConfig": { "responseMimeType": "application/json" }
  };

  const options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  // --- 核心重试逻辑开始 ---
  const maxRetries = 5; 
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = UrlFetchApp.fetch(API_URL, options);
      const responseCode = response.getResponseCode();
      
      console.log(`--- [DEBUG] 第 ${i + 1} 次尝试，响应代码: ${responseCode} ---`);

      if (responseCode === 200) {
        const responseObj = JSON.parse(response.getContentText());
        if (!responseObj.candidates || !responseObj.candidates[0].content) return null;

        const aiResponseText = responseObj.candidates[0].content.parts[0].text;

        console.log("--- [DEBUG] AI 原始输出: " + aiResponseText);
        
        const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsedData = JSON.parse(jsonMatch[0]); // 先解析
            console.log("--- [DEBUG] JSON 解析成功，提取到 " + parsedData.events.length + " 个日程 ---"); // 再打印
            return parsedData;
            return JSON.parse(jsonMatch[0]); // 成功解析直接返回结果            
          } catch (e) {
            // 暴力清洗逻辑...
              console.warn("--- [DEBUG] 第 " + (i+1) + " 次初次 JSON 解析失败，尝试暴力清洗换行符... ---");
              const cleaned = jsonMatch[0].replace(/\n/g, "").replace(/\r/g, "");
              try {
                const parsedData = JSON.parse(cleaned);
                console.log("--- [DEBUG] 暴力清洗后解析成功！ ---");
                return parsedData;
              } catch (finalError) {
                console.error("--- [DEBUG] 暴力清洗后依然无法解析 JSON: " + finalError);
                // 这里不要直接返回 null，让它继续循环重试，或者等待下一次 API 响应
              }
          }
        }
      } 
      
      // 如果遇到 503 或 429（高峰拥堵），启动等待重试
      if (responseCode === 503 || responseCode === 429) {
        const waitTime = Math.pow(2, i) * 5000; // 5s, 10s, 20s, 40s...
        console.warn(`服务器繁忙 (503/429)，等待 ${waitTime/1000} 秒后进行第 ${i+2} 次尝试...`);
        Utilities.sleep(waitTime);
        continue; // 继续下一次循环
      }

      // 如果是其他错误（如 400），说明是格式或 Key 有问题，重试也没用
      console.error("API 返回非预期错误，停止重试: " + response.getContentText());
      break;

    } catch (err) {
      console.error(`网络异常 (第 ${i+1} 次): ${err}`);
      Utilities.sleep(5000);
    }
  }
  
  console.error("--- [DEBUG] 达到最大重试次数，任务失败 ---");
  return null;
}