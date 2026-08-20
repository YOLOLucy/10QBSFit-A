import { QuestionDBItem } from '../types';

/**
 * Escapes and quotes a CSV field value
 */
function escapeCSVField(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '""';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Exports an array of QuestionDBItem objects to a downloadable CSV file.
 * Includes UTF-8 BOM (\uFEFF) to ensure Microsoft Excel and Google Sheets open Traditional Chinese without encoding issues.
 */
export function exportQuestionsToCSV(questions: QuestionDBItem[], filename = 'health_question_bank.csv'): void {
  const headers = [
    '題目編號',
    '歸屬類別',
    '題目內容',
    '財務屬性',
    '權重點數',
    'Andy Galpin 生理機制',
    '詳細解說',
    '實踐小撇步',
    '是否自訂'
  ];

  const rows = questions.map((q) => {
    const categoryZh = 
      q.category === 'nutrition' ? '飲食營養' :
      q.category === 'exercise' ? '運動鍛鍊' :
      q.category === 'hydration' ? '飲水與晝夜' : '體重追蹤';

    const attributeZh = q.attribute === 'asset' ? '資產' : '負債';

    return [
      escapeCSVField(q.question_id),
      escapeCSVField(categoryZh),
      escapeCSVField(q.question_text),
      escapeCSVField(attributeZh),
      escapeCSVField(q.weight),
      escapeCSVField(q.galpin_principle),
      escapeCSVField(q.description || ''),
      escapeCSVField(q.tip || ''),
      escapeCSVField(q.isCustom ? '是' : '否')
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads a clean CSV template for users to fill in Excel/Google Sheets
 */
export function downloadCSVTemplate(filename = 'health_question_template.csv'): void {
  const headers = [
    '題目編號',
    '歸屬類別',
    '題目內容',
    '財務屬性',
    '權重點數',
    'Andy Galpin 生理機制',
    '詳細解說',
    '實踐小撇步'
  ];

  const sampleRows = [
    [
      escapeCSVField('CUST_001'),
      escapeCSVField('飲食營養'),
      escapeCSVField('今天午晚餐是否均攝取了至少一個手掌大的優質蛋白質？'),
      escapeCSVField('資產'),
      escapeCSVField('10'),
      escapeCSVField('mTOR Muscle Protein Synthesis'),
      escapeCSVField('足量蛋白質提供必需胺基酸，刺激肌肉蛋白質合成修復。'),
      escapeCSVField('每餐搭配雞胸肉、鮭魚、豆腐或毛豆。')
    ].join(','),
    [
      escapeCSVField('CUST_002'),
      escapeCSVField('運動鍛鍊'),
      escapeCSVField('今天是否完成了 30 分鐘 Zone 2 慢跑或快走有氧？'),
      escapeCSVField('資產'),
      escapeCSVField('12'),
      escapeCSVField('Mitochondrial Biogenesis'),
      escapeCSVField('Zone 2 有氧能增加細胞粒線體數量並提升脂肪氧化代謝能力。'),
      escapeCSVField('速度維持在微喘但能講出完整句子的強度。')
    ].join(','),
    [
      escapeCSVField('CUST_003'),
      escapeCSVField('飲水與晝夜'),
      escapeCSVField('今天是否飲用了超過一杯含糖手搖飲或過量甜點？'),
      escapeCSVField('負債'),
      escapeCSVField('10'),
      escapeCSVField('Glycemic Spike & Neuroinflammation'),
      escapeCSVField('精緻高糖會導致血糖劇烈波動並刺激體內發炎因子。'),
      escapeCSVField('下午嘴饞時改喝無糖氣泡水或黑咖啡。')
    ].join(',')
  ];

  const csvContent = '\uFEFF' + [headers.join(','), ...sampleRows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Robust CSV parser that handles quotes, commas inside fields, and newlines
 */
function parseCSVToRows(text: string): string[][] {
  // Strip UTF-8 BOM if present
  let cleanText = text;
  if (cleanText.charCodeAt(0) === 0xFEFF) {
    cleanText = cleanText.slice(1);
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip next quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      currentRow.push(currentField.trim());
      if (currentRow.some((f) => f.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export interface CSVParseResult {
  success: boolean;
  data: QuestionDBItem[];
  errors: string[];
  totalParsed: number;
}

/**
 * Parses uploaded CSV text and maps to QuestionDBItem[]
 */
export function parseQuestionsFromCSV(csvText: string): CSVParseResult {
  const rows = parseCSVToRows(csvText);
  if (rows.length === 0) {
    return { success: false, data: [], errors: ['CSV 檔案內容為空'], totalParsed: 0 };
  }

  const header = rows[0].map((h) => h.toLowerCase().replace(/[\s_]/g, ''));
  
  // Find column indices
  let colId = header.findIndex((h) => h.includes('編號') || h.includes('id'));
  let colCategory = header.findIndex((h) => h.includes('類別') || h.includes('category'));
  let colText = header.findIndex((h) => h.includes('題目') || h.includes('內容') || h.includes('question') || h.includes('text'));
  let colAttr = header.findIndex((h) => h.includes('屬性') || h.includes('attribute') || h.includes('資產') || h.includes('負債'));
  let colWeight = header.findIndex((h) => h.includes('權重') || h.includes('weight') || h.includes('點數'));
  let colPrinciple = header.findIndex((h) => h.includes('原理') || h.includes('機制') || h.includes('principle') || h.includes('galpin'));
  let colDesc = header.findIndex((h) => h.includes('解說') || h.includes('說明') || h.includes('description') || h.includes('desc'));
  let colTip = header.findIndex((h) => h.includes('撇步') || h.includes('tip') || h.includes('建議'));

  // Default index fallbacks if standard template order was used without exact header match
  if (colCategory === -1 && rows[0].length >= 3) colCategory = 1;
  if (colText === -1 && rows[0].length >= 3) colText = 2;
  if (colAttr === -1 && rows[0].length >= 4) colAttr = 3;

  const results: QuestionDBItem[] = [];
  const errors: string[] = [];

  // Start from line 1 (skip header)
  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (row.length === 0 || row.every((val) => val === '')) continue;

    const rawText = colText !== -1 ? row[colText] : row[2] || row[1];
    if (!rawText || rawText.trim() === '') {
      errors.push(`第 ${rowIndex + 1} 行：缺少題目內容，已略過。`);
      continue;
    }

    const rawCategory = colCategory !== -1 ? (row[colCategory] || '').toLowerCase() : '';
    let category: 'nutrition' | 'exercise' | 'hydration' | 'weight' = 'nutrition';
    if (rawCategory.includes('運') || rawCategory.includes('exercise') || rawCategory.includes('sport') || rawCategory.includes('肌')) {
      category = 'exercise';
    } else if (rawCategory.includes('水') || rawCategory.includes('hydrat') || rawCategory.includes('睡') || rawCategory.includes('復') || rawCategory.includes('晝夜')) {
      category = 'hydration';
    } else if (rawCategory.includes('重') || rawCategory.includes('weight')) {
      category = 'weight';
    } else {
      category = 'nutrition';
    }

    const rawAttr = colAttr !== -1 ? (row[colAttr] || '').toLowerCase() : '';
    let attribute: 'asset' | 'liability' = 'asset';
    if (rawAttr.includes('負') || rawAttr.includes('liability') || rawAttr.includes('扣') || rawAttr.includes('壞') || rawAttr.includes('扣分')) {
      attribute = 'liability';
    } else {
      attribute = 'asset';
    }

    const rawWeight = colWeight !== -1 ? parseInt(row[colWeight], 10) : 10;
    const weight = !isNaN(rawWeight) && rawWeight > 0 ? rawWeight : 10;

    const rawId = colId !== -1 && row[colId] ? row[colId] : `CSV_${Date.now()}_${rowIndex}`;
    const principle = colPrinciple !== -1 && row[colPrinciple] ? row[colPrinciple] : 'Personalized Health Accounting Target';
    const desc = colDesc !== -1 && row[colDesc] ? row[colDesc] : rawText;
    const tip = colTip !== -1 && row[colTip] ? row[colTip] : '持之以恆，每天為身體存入健康資產！';

    results.push({
      question_id: rawId,
      category,
      type: 'boolean',
      question_text: rawText.trim(),
      attribute,
      weight,
      galpin_principle: principle.trim(),
      description: desc.trim(),
      tip: tip.trim(),
      isCustom: true
    });
  }

  return {
    success: results.length > 0,
    data: results,
    errors,
    totalParsed: results.length
  };
}
