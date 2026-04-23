// ================= 配置区 =================
const props = PropertiesService.getScriptProperties();

const BOT_EMAIL    = props.getProperty("BOT_EMAIL");
const LABEL_WAITING = "待中转";  // 过滤器自动打上的标签
const LABEL_DONE    = "已中转";  // 处理完打上的标签
const MAX_BODY_CHARS = 8000;
// ==========================================