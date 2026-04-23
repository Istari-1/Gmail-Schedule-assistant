// ================= 配置区 =================
const props = PropertiesService.getScriptProperties();

const GEMINI_API_KEY = props.getProperty('GEMINI_API_KEY');
const CHAT_WEBHOOK_URL = props.getProperty('CHAT_WEBHOOK');

const SEARCH_QUERY = 'subject:"[TRANS]" in:inbox';
const MODEL_ID     = "gemini-3.1-flash-lite-preview"; 
// ==========================================