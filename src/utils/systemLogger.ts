import { SystemLogEntry } from '../types';

const LOG_STORAGE_KEY = '10qbs_system_diagnostic_logs';
const MAX_LOGS = 100;

export function getEnvironmentInfo() {
  const isClient = typeof window !== 'undefined';
  const host = isClient ? window.location.hostname : 'server';
  const protocol = isClient ? window.location.protocol : 'https:';
  const href = isClient ? window.location.href : '';
  const userAgent = isClient ? navigator.userAgent : 'node';
  const online = isClient ? navigator.onLine : true;

  const isNetlify = host.includes('netlify.app') || href.includes('netlify') || process.env.NETLIFY === 'true';
  const isAiStudio = host.includes('run.app') || host.includes('aistudio') || host.includes('google');
  const isLocalhost = host.includes('localhost') || host === '127.0.0.1';

  return {
    host,
    protocol,
    isNetlify,
    isAiStudio,
    isLocalhost,
    userAgent,
    online,
  };
}

export function addSystemLog(entry: {
  level: 'info' | 'warn' | 'error' | 'success';
  module: 'meal_plan' | 'google_ai' | 'grocery' | 'auth' | 'system' | 'netlify_deploy';
  action: string;
  message: string;
  details?: Record<string, any>;
  errorStack?: string;
}): SystemLogEntry {
  const now = new Date();
  const env = getEnvironmentInfo();

  const newLog: SystemLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now.toISOString(),
    localTime: now.toLocaleString('zh-TW', { hour12: false }),
    level: entry.level,
    module: entry.module,
    action: entry.action,
    environment: env,
    details: entry.details,
    message: entry.message,
    errorStack: entry.errorStack,
  };

  try {
    const existing = getSystemLogs();
    const updated = [newLog, ...existing].slice(0, MAX_LOGS);
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('[SystemLogger] Failed to save log to localStorage:', e);
  }

  // Also print to browser console with color coding
  const logPrefix = `[10QBS Log][${newLog.module}][${newLog.level.toUpperCase()}] ${newLog.action}:`;
  if (entry.level === 'error') {
    console.error(logPrefix, newLog.message, newLog.details || '', entry.errorStack || '');
  } else if (entry.level === 'warn') {
    console.warn(logPrefix, newLog.message, newLog.details || '');
  } else {
    console.log(logPrefix, newLog.message, newLog.details || '');
  }

  return newLog;
}

export function getSystemLogs(): SystemLogEntry[] {
  try {
    const raw = localStorage.getItem(LOG_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function clearSystemLogs(): void {
  try {
    localStorage.removeItem(LOG_STORAGE_KEY);
  } catch (e) {
    console.warn('[SystemLogger] Failed to clear logs:', e);
  }
}

export function exportLogsAsText(): string {
  const logs = getSystemLogs();
  const env = getEnvironmentInfo();
  
  let output = `=======================================================\n`;
  output += `  10QBS 健康資產負債表 - 系統運行與 Netlify 部署診斷 Log\n`;
  output += `=======================================================\n`;
  output += `生成時間: ${new Date().toLocaleString('zh-TW')}\n`;
  output += `當前主機 (Host): ${env.host}\n`;
  output += `環境識別: ${env.isNetlify ? 'Netlify 雲端部署' : env.isAiStudio ? 'Google AI Studio 容器' : env.isLocalhost ? 'Localhost 本機環境' : '獨立自訂託管'}\n`;
  output += `網路連線狀態: ${env.online ? '在線 (Online)' : '離線 (Offline)'}\n`;
  output += `使用者瀏覽器 (User-Agent): ${env.userAgent}\n`;
  output += `總記錄筆數: ${logs.length} 筆\n`;
  output += `=======================================================\n\n`;

  if (logs.length === 0) {
    output += `[無歷史日誌記錄]\n`;
    return output;
  }

  logs.forEach((log, index) => {
    output += `[#${logs.length - index}] ${log.localTime} [${log.level.toUpperCase()}] [模組: ${log.module}]\n`;
    output += `動作 (Action): ${log.action}\n`;
    output += `訊息 (Message): ${log.message}\n`;
    if (log.details) {
      output += `詳細參數 (Details):\n${JSON.stringify(log.details, null, 2)}\n`;
    }
    if (log.errorStack) {
      output += `錯誤堆疊 (Stack Trace):\n${log.errorStack}\n`;
    }
    output += `-------------------------------------------------------\n`;
  });

  return output;
}

export function exportLogsAsJson(): string {
  const logs = getSystemLogs();
  const env = getEnvironmentInfo();
  return JSON.stringify({
    reportTitle: '10QBS System Diagnostic Report',
    exportedAt: new Date().toISOString(),
    environment: env,
    totalLogs: logs.length,
    logs,
  }, null, 2);
}

export function downloadLogFile(format: 'json' | 'txt' = 'txt'): void {
  const isJson = format === 'json';
  const content = isJson ? exportLogsAsJson() : exportLogsAsText();
  const mimeType = isJson ? 'application/json' : 'text/plain;charset=utf-8';
  const filename = `10qbs_diagnostic_log_${new Date().toISOString().slice(0, 10)}_${Date.now().toString().slice(-4)}.${format}`;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
