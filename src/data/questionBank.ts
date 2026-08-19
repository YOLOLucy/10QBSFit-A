import { HealthQuestion, QuestionDBItem } from '../types';
import { 
  loadCustomQuestions, 
  loadPurchasedPackIds, 
  MARKETPLACE_QUESTION_PACKS 
} from './questionPacks';

/**
 * Health Question Database (Galpin Human Performance & Health Accounting Model)
 * Schema format:
 * {
 *   "question_id": string,
 *   "category": "nutrition" | "exercise" | "hydration" | "weight",
 *   "type": "boolean" | "numeric",
 *   "question_text": string,
 *   "attribute": "asset" | "liability",
 *   "weight": number,
 *   "galpin_principle": string
 * }
 */
export const QUESTION_DATABASE: QuestionDBItem[] = [
  // ==========================================
  // 1. NUTRITION CATEGORY (N001 ~ N008)
  // ==========================================
  {
    question_id: 'N001',
    category: 'nutrition',
    type: 'boolean',
    question_text: '今天的主要蛋白質來源是否來自原型肉品、蛋或魚？',
    attribute: 'asset',
    weight: 10,
    galpin_principle: 'High Biological Value Protein & Muscle Preservation',
    description: '例如雞胸肉、雞蛋、鮭魚、板豆腐、毛豆或低脂海鮮，高生物價蛋白質是修復肌纖維與刺激肌蛋白合成 (MPS) 的關鍵資產。',
    tip: '每餐確保攝取含 2-3g 白胺酸 (Leucine) 的優質蛋白，最能驅動肌肉修復。',
  },
  {
    question_id: 'N002',
    category: 'nutrition',
    type: 'boolean',
    question_text: '今天是否吃足約3個手掌大小的優質蛋白質？',
    attribute: 'asset',
    weight: 12,
    galpin_principle: 'Optimal Daily Protein Distribution (1.6-2.2g/kg Target)',
    description: '每日平均攝取足量蛋白質（每公斤體重 1.6~2.0 克），能維持肌肉量、增加食物熱效應並提供長效飽足感。',
    tip: '將每日蛋白質均勻分配至 3~4 餐，每餐約一個手掌心份量，吸收利用率最高。',
  },
  {
    question_id: 'N003',
    category: 'nutrition',
    type: 'boolean',
    question_text: '今天是否有攝取至少2碗以上的深色蔬菜與高纖蔬食？',
    attribute: 'asset',
    weight: 10,
    galpin_principle: 'Micronutrient Density, Electrolytes & Microbiome Diversity',
    description: '深綠色蔬菜富含多酚、鎂、鉀離子與水溶性纖維，可促進腸道菌叢發酵產生短鏈脂肪酸 (SCFA) 並抗發炎。',
    tip: '多色蔬菜搭配（綠、紅、黃、紫），天然植化素與抗氧化效果更全面！',
  },
  {
    question_id: 'N004',
    category: 'nutrition',
    type: 'boolean',
    question_text: '今天三餐是否以原型食物為主，遠離超加工食品 (UPF)？',
    attribute: 'asset',
    weight: 10,
    galpin_principle: 'Thermic Effect of Food (TEF) & Glycemic Stability',
    description: '避免含高果糖糖漿、人工乳化劑與精緻鈉鹽的超加工食品，選擇看得出原本樣貌的原型食材。',
    tip: '原型食物的食物熱效應 (TEF) 可高達 10-15%，能讓身體在消化時自然消耗更多熱量。',
  },
  {
    question_id: 'N005',
    category: 'nutrition',
    type: 'boolean',
    question_text: '今天是否成功拒絕油炸物、高糖甜點與高熱量宵夜？',
    attribute: 'liability',
    weight: 12,
    galpin_principle: 'Anti-Inflammatory Modulation & Visceral Fat Mitigation',
    description: '高溫劣變油脂與精緻糖會引發體內氧化壓力、刺激晚期糖化終產物 (AGEs) 並加速內臟脂肪累積。',
    tip: '遠離精緻糖與油炸，是降低全身慢性低度發炎與改善胰島素阻抗最快速的手段。',
  },
  {
    question_id: 'N006',
    category: 'nutrition',
    type: 'boolean',
    question_text: '今天是否完全不喝含糖手搖杯與液態果糖包裝飲料？',
    attribute: 'liability',
    weight: 10,
    galpin_principle: 'Hepatic De Novo Lipogenesis & Satiety Signal Bypass',
    description: '液態果糖會直接經由門靜脈被肝臟吸收轉化為三酸甘油酯與脂肪肝，且無法激發大腦的瘦素飽足訊號。',
    tip: '以無糖綠茶、冷萃黑咖啡或氣泡檸檬水取代含糖飲品，輕鬆減去多餘液態熱量。',
  },
  {
    question_id: 'N007',
    category: 'nutrition',
    type: 'boolean',
    question_text: '今天是否有攝取好油脂（如特級初榨橄欖油、酪梨、堅果或Omega-3魚油）？',
    attribute: 'asset',
    weight: 8,
    galpin_principle: 'Cell Membrane Fluidity & Steroid Hormone Synthesis',
    description: '單元與多元不飽和脂肪酸是建構細胞膜、合成睪固酮與雌激素，並吸收脂溶性維生素 (A/D/E/K) 的核心基質。',
    tip: '每天一小把無調味堅果（約10-15顆）或淋一湯匙特級冷壓橄欖油最適量。',
  },
  {
    question_id: 'N008',
    category: 'nutrition',
    type: 'boolean',
    question_text: '今天用餐時是否有細嚼慢嚥（每口咀嚼15下以上）且不配手機分心？',
    attribute: 'asset',
    weight: 8,
    galpin_principle: 'Cephalic Phase Digestion & Leptin Satiation Cascade',
    description: '細嚼慢嚥能讓大腦下視丘在進食20分鐘後順利接收瘦素 (Leptin) 飽足信號，預防無意識過量進食。',
    tip: '放下手機專注食物香氣與口感，每餐食量自然減少 15%，消化吸收更舒適。',
  },

  // ==========================================
  // 2. EXERCISE & MOVEMENT (E001 ~ E008)
  // ==========================================
  {
    question_id: 'E001',
    category: 'exercise',
    type: 'boolean',
    question_text: '今天是否有進行累積超過30分鐘的中高強度或Zone 2運動？',
    attribute: 'asset',
    weight: 12,
    galpin_principle: 'Zone 2 Mitochondrial Biogenesis & VO2 Max Endurance',
    description: '例如慢跑、游泳、快走上坡、自行車或划船，能刺激粒線體密度倍增，大幅增強脂肪酸氧化能力與心肺儲備。',
    tip: 'Zone 2 運動強度為「可以呼吸對話但無法輕鬆唱歌」，是提升基礎代謝的黃金區間。',
  },
  {
    question_id: 'E002',
    category: 'exercise',
    type: 'boolean',
    question_text: '今日全天走路累積步數是否達到或超過7,000步？',
    attribute: 'asset',
    weight: 10,
    galpin_principle: 'Non-Exercise Activity Thermogenesis (NEAT) Optimization',
    description: '非運動性熱量消耗 (NEAT) 佔每日總熱量消耗達 15-30%，是維持體脂不反彈最強大的長效槓桿。',
    tip: '利用飯後散步 10 分鐘或通勤提前一站下車，輕鬆達標 7000-10000 步！',
  },
  {
    question_id: 'E003',
    category: 'exercise',
    type: 'boolean',
    question_text: '今天是否有進行至少10-15分鐘的肌力或抗阻重訓（深蹲/伏地挺身/啞鈴）？',
    attribute: 'asset',
    weight: 12,
    galpin_principle: 'Mechanical Tension, GLUT4 Translocation & Hypertrophy',
    description: '骨骼肌是人體最大的葡萄糖調節庫，抗阻訓練能促使 GLUT4 轉位，不依賴胰島素即可清除血液中多餘血糖。',
    tip: '徒手深蹲 3 組每組 15 下，或彈力帶划船，即可有效刺激大肌群代謝開關。',
  },
  {
    question_id: 'E004',
    category: 'exercise',
    type: 'boolean',
    question_text: '今天是否有進行全身關節活動度 (Mobility)、筋膜滾筒或伸展？',
    attribute: 'asset',
    weight: 8,
    galpin_principle: 'Fascial Elasticity, Joint Kinematics & Injury Prevention',
    description: '保持關節活動度與肌筋膜彈性，能改善微循環、解除肌肉代償緊繃並抑制交感神經高張。',
    tip: '睡前進行 10 分鐘下背與髖關節開展伸展，可顯著改善睡眠深層指數。',
  },
  {
    question_id: 'E005',
    category: 'exercise',
    type: 'boolean',
    question_text: '今天久坐工作時，是否有做到每50-60分鐘起身走動活動？',
    attribute: 'asset',
    weight: 8,
    galpin_principle: 'Lipoprotein Lipase (LPL) Activation & Endothelial Shear Stress',
    description: '連續久坐會使下肢血管內皮細胞的脂蛋白脂肪酶 (LPL) 活性驟降 90%，起身活動 2 分鐘即可重新喚醒酵素。',
    tip: '設定番茄鐘或智慧手錶提醒，每小時喝水並伸展肩膀走動 2 分鐘。',
  },
  {
    question_id: 'E006',
    category: 'exercise',
    type: 'boolean',
    question_text: '今天是否有主動選擇爬樓梯或多步行，取代手扶梯與短程坐車？',
    attribute: 'asset',
    weight: 8,
    galpin_principle: 'Incidental Movement Density & Eccentric Lower Body Loading',
    description: '爬樓梯提供極佳的下肢向心與離心負荷刺激，微習慣積少成多，一年可額外多消耗上萬大卡。',
    tip: '每天爬 3-5 層樓梯，能有效鍛鍊股四頭肌與臀大肌，保護膝關節。',
  },
  {
    question_id: 'E007',
    category: 'exercise',
    type: 'boolean',
    question_text: '今天運動時是否有達到輕微呼吸急促、出汗或心率提高的自覺強度？',
    attribute: 'asset',
    weight: 10,
    galpin_principle: 'Rating of Perceived Exertion (RPE) & Sympathetic Activation',
    description: '適度的心肺與神經衝擊才能迫使心臟輸出量 (Stroke Volume) 與毛細血管擴張適應。',
    tip: '運動自覺努力程度 (RPE) 達到 6-8 分（滿分 10），代謝刺激最顯著。',
  },
  {
    question_id: 'E008',
    category: 'exercise',
    type: 'boolean',
    question_text: '今天是否保持良好坐姿與站姿，避免長時間低頭駝背與骨盆前傾？',
    attribute: 'asset',
    weight: 8,
    galpin_principle: 'Spinal Alignment, Core Bracing & Diaphragmatic Function',
    description: '良好脊椎排列能確保橫膈膜完整擴張、避免頸椎前屈 (Forward Head Posture) 壓迫神經與呼吸道。',
    tip: '將電腦螢幕架高至視線平視高度，雙腳平貼地面，自然收下巴。',
  },

  // ==========================================
  // 3. HYDRATION & RECOVERY (H001 ~ H008)
  // ==========================================
  {
    question_id: 'H001',
    category: 'hydration',
    type: 'boolean',
    question_text: '今天喝純白開水總量是否達到或超過2,000cc（或體重×35cc）？',
    attribute: 'asset',
    weight: 10,
    galpin_principle: 'Galpin Hydration Equation (Bodyweight/30 Fluid Replacement)',
    description: '依據 Galpin 水分公式，維持細胞內外滲透壓平衡與血漿容量，是體溫調節與脂肪水解 (Lipolysis) 的先決條件。',
    tip: '脫水僅 2% 就會使大腦認知專注度下降 15%、重訓力量輸出衰退 10%。',
  },
  {
    question_id: 'H002',
    category: 'hydration',
    type: 'boolean',
    question_text: '今天早晨起床後，是否有先喝一杯300-500cc的溫開水？',
    attribute: 'asset',
    weight: 8,
    galpin_principle: 'Gastrocolic Reflex Activation & Hemodilution Recovery',
    description: '晨起溫水能補足夜間呼吸流失的水分、稀釋清晨高黏稠度的血液，並刺激胃結腸反射啟動晨間排便。',
    tip: '水溫約 35-40 度最溫和，可加少許海鹽補充夜間流失的微量電解質。',
  },
  {
    question_id: 'H003',
    category: 'hydration',
    type: 'boolean',
    question_text: '今天是否有在晚上11點前準備就寢，避免熬夜夜貓作息？',
    attribute: 'asset',
    weight: 12,
    galpin_principle: 'Circadian Rhythm Alignment & Growth Hormone (GH) Pulsatility',
    description: '晚上 11 點至凌晨 2 點為深層慢波睡眠 (SWS) 與生長激素 (GH) 分泌的高峰期，主導組織細胞與膠原蛋白深層修復。',
    tip: '熬夜會使隔天飢餓素 (Ghrelin) 上升 25%，造成大腦狂熱渴望高碳水食物。',
  },
  {
    question_id: 'H004',
    category: 'hydration',
    type: 'boolean',
    question_text: '昨晚是否有睡足7到8小時的連續充沛深度睡眠？',
    attribute: 'asset',
    weight: 12,
    galpin_principle: 'Glymphatic Brain Detoxification & Neuroendocrine Recovery',
    description: '充足睡眠期間，大腦膠淋巴系統 (Glymphatic System) 流量增加 60%，能高效清除類澱粉蛋白與代謝廢物。',
    tip: '睡前 60 分鐘關閉藍光電子螢幕，維持臥室溫度約 19-21°C 最助眠。',
  },
  {
    question_id: 'H005',
    category: 'hydration',
    type: 'boolean',
    question_text: '今天三餐飯後是否有進行10-15分鐘的輕鬆走動散步？',
    attribute: 'asset',
    weight: 8,
    galpin_principle: 'Postprandial Glycemic Attenuation via Muscle Contraction',
    description: '餐後即時散步可顯著降低餐後血糖高峰達 30%，讓葡萄糖直接被下肢肌群吸收，預防脂肪合成囤積。',
    tip: '飯後站立散步或洗碗 15 分鐘，效益遠大於坐著不動。',
  },
  {
    question_id: 'H006',
    category: 'hydration',
    type: 'boolean',
    question_text: '今天是否有給自己至少5-10分鐘進行深層呼吸、靜心或放鬆冥想？',
    attribute: 'asset',
    weight: 8,
    galpin_principle: 'Parasympathetic Vagal Tone Activation & Cortisol Reset',
    description: '透過生理性嘆息 (Physiological Sigh) 或慢速腹式呼吸，能直接刺激迷走神經，降低心率與血中壓力荷爾蒙 (皮質醇)。',
    tip: '採用「雙吸慢吐」的生理嘆息法（鼻吸兩次、嘴巴緩慢長吐），3 次即可重置自律神經。',
  },
  {
    question_id: 'H007',
    category: 'hydration',
    type: 'boolean',
    question_text: '今天下午兩點後是否有節制咖啡因攝取，避免影響夜間腺苷 (Adenosine)？',
    attribute: 'asset',
    weight: 8,
    galpin_principle: 'Adenosine Receptor Half-Life & Sleep Architecture Protection',
    description: '咖啡因半衰期長達 5-7 小時，過晚攝取會阻斷大腦腺苷受體，即使入睡也會嚴重破壞深層睡眠結構。',
    tip: '下午 2 點後改喝洋甘菊茶、無咖啡因南非國寶茶或白開水。',
  },
  {
    question_id: 'H008',
    category: 'hydration',
    type: 'boolean',
    question_text: '今天是否在白天有接觸 10-15 分鐘的戶外天然陽光？',
    attribute: 'asset',
    weight: 8,
    galpin_principle: 'Retinal Melanopsin Signaling & Circadian Clock Synchronization',
    description: '早晨與白天的自然陽光能刺激視網膜黑視素 (Melanopsin)，校準下視丘視交叉上核 (SCN) 生理時鐘，並促進夜間褪黑激素生成。',
    tip: '早晨出門散步或在陽台曬太陽 10 分鐘，夜間入睡更快、更深沉。',
  },

  // ==========================================
  // 4. WEIGHT & BODY COMPOSITION (W001)
  // ==========================================
  {
    question_id: 'W001',
    category: 'weight',
    type: 'numeric',
    question_text: '今天早晨是否已測量並記錄當前空腹體重與體態變化？',
    attribute: 'asset',
    weight: 15,
    galpin_principle: 'Biofeedback Self-Regulation & Trend Velocity Tracking',
    description: '規律測量體重是維持體態自覺最重要的儀式。面對真實數字，掌握每週趨勢線，精準校準飲食熱量與能量平衡！',
    tip: '建議每日早晨起床、排空膀胱後於相同條件下空腹測量，數據最具一致性與科學參考價值。',
  },
];

/**
 * Maps a raw QuestionDBItem into a rich interactive HealthQuestion object for UI components.
 */
export function convertDBItemToHealthQuestion(item: QuestionDBItem): HealthQuestion {
  const isPositiveYes = item.attribute === 'asset';
  const baseValue = item.weight * 15; // standard scaling to balance sheet currency points

  let assetLabel = '健康優化增值資產';
  let liabilityLabel = '健康透支流失負債';
  let iconName = 'Sparkles';

  if (item.category === 'nutrition') {
    iconName = 'Utensils';
    assetLabel = item.attribute === 'asset' ? '優質營養代謝資產' : '抗炎自律清淨資產';
    liabilityLabel = item.attribute === 'asset' ? '營養攝取不足負債' : '糖毒與超加工負債';
  } else if (item.category === 'exercise') {
    iconName = 'Dumbbell';
    assetLabel = '運動心肺肌力資產';
    liabilityLabel = '靜態久坐衰退負債';
  } else if (item.category === 'hydration') {
    iconName = 'Droplet';
    assetLabel = '循環排毒修復資產';
    liabilityLabel = '脫水熬夜壓力負債';
  } else if (item.category === 'weight') {
    iconName = 'Scale';
    assetLabel = '體重自覺追蹤資產';
    liabilityLabel = '體重逃避盲目負債';
  }

  return {
    id: item.question_id,
    question_id: item.question_id,
    category: item.category,
    type: item.type,
    title: item.question_text,
    question_text: item.question_text,
    description: item.description || item.question_text,
    positiveAnswer: isPositiveYes ? 'yes' : 'no',
    attribute: item.attribute,
    weightPoint: item.weight,
    assetValue: baseValue,
    liabilityValue: Math.round(baseValue * 0.9),
    assetLabel,
    liabilityLabel,
    iconName,
    tip: item.tip || '保持自律微習慣，每天為身體存入健康複利！',
    galpin_principle: item.galpin_principle,
  };
}

/**
 * Filter questions by category in the Question Database
 */
export const NUTRITION_QUESTIONS = QUESTION_DATABASE.filter((q) => q.category === 'nutrition');
export const EXERCISE_QUESTIONS = QUESTION_DATABASE.filter((q) => q.category === 'exercise');
export const HYDRATION_QUESTIONS = QUESTION_DATABASE.filter((q) => q.category === 'hydration');
export const WEIGHT_QUESTION_DB = QUESTION_DATABASE.find((q) => q.category === 'weight') || QUESTION_DATABASE[QUESTION_DATABASE.length - 1];

/**
 * Returns the full merged question database including base questions,
 * purchased expansion packs (50 questions each), and user-defined custom questions.
 */
export function getAllMergedQuestionDatabase(
  customQuestions?: QuestionDBItem[],
  purchasedPackIds?: string[]
): QuestionDBItem[] {
  const custom = customQuestions ?? loadCustomQuestions();
  const packIds = purchasedPackIds ?? loadPurchasedPackIds();

  const unlockedPackQuestions: QuestionDBItem[] = [];
  packIds.forEach((id) => {
    const pack = MARKETPLACE_QUESTION_PACKS.find((p) => p.id === id);
    if (pack) {
      unlockedPackQuestions.push(...pack.questions);
    }
  });

  return [...QUESTION_DATABASE, ...unlockedPackQuestions, ...custom];
}

/**
 * Generates 10 questions for a given date seed:
 * - 3 from Nutrition category
 * - 3 from Exercise category
 * - 3 from Hydration/Recovery category
 * - 1 mandatory Weight question (W001)
 * Seamlessly samples from the entire expanded active database pool!
 */
export function getDailyQuestionsForDate(
  dateStr: string,
  customQuestions?: QuestionDBItem[],
  purchasedPackIds?: string[]
): HealthQuestion[] {
  // Deterministic seed based on date string e.g. "2026-08-18"
  let seed = 0;
  for (let i = 0; i < dateStr.length; i++) {
    seed = (seed * 31 + dateStr.charCodeAt(i)) >>> 0;
  }

  const allQuestions = getAllMergedQuestionDatabase(customQuestions, purchasedPackIds);

  const nutritions = allQuestions.filter((q) => q.category === 'nutrition');
  const exercises = allQuestions.filter((q) => q.category === 'exercise');
  const hydrations = allQuestions.filter((q) => q.category === 'hydration');
  const weightQ = allQuestions.find((q) => q.category === 'weight') || WEIGHT_QUESTION_DB;

  const shuffle = <T>(arr: T[], seedOffset: number): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = ((seed + seedOffset + i * 17) % (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const selectedNutrition = shuffle(nutritions, 1).slice(0, 3).map(convertDBItemToHealthQuestion);
  const selectedExercise = shuffle(exercises, 2).slice(0, 3).map(convertDBItemToHealthQuestion);
  const selectedHydration = shuffle(hydrations, 3).slice(0, 3).map(convertDBItemToHealthQuestion);
  const weightQuestion = convertDBItemToHealthQuestion(weightQ);

  return [...selectedNutrition, ...selectedExercise, ...selectedHydration, weightQuestion];
}

