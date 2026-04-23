function sendTextMessage(text) {
  try {
    const response = UrlFetchApp.fetch(CHAT_WEBHOOK_URL, {
      method: "POST",
      contentType: "application/json",
      payload: JSON.stringify({ text: text }),
      muteHttpExceptions: true
    });

    const code = response.getResponseCode();

    if (code !== 200) {
      console.error("发送失败，状态码: " + code);
      console.error("响应内容: " + response.getContentText());
      return false;
    }

    return true;

  } catch (e) {
    console.error("文字发送失败: " + e);
    return false;
  }
}