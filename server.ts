import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

// Resilient helper to call Gemini with multi-model fallback and retry on 503/429
async function generateWithModelFallback(
  ai: GoogleGenAI,
  callConfig: {
    systemInstruction?: string;
    prompt: string;
    responseMimeType?: string;
    responseSchema?: any;
  }
) {
  // Primary model is gemini-2.5-flash (fast, stable, highly available), with fallback to gemini-2.5-pro and gemini-3.7-flash
  const models = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-3.7-flash"];
  let lastError: any = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        console.log(`[Gemini API] Attempting with model: ${model} (attempt ${attempt + 1})`);
        const config: any = {};
        if (callConfig.systemInstruction) config.systemInstruction = callConfig.systemInstruction;
        if (callConfig.responseMimeType) config.responseMimeType = callConfig.responseMimeType;
        if (callConfig.responseSchema) config.responseSchema = callConfig.responseSchema;

        const response = await ai.models.generateContent({
          model,
          contents: callConfig.prompt,
          config,
        });

        if (response && response.text) {
          return { text: response.text, modelUsed: model };
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        const status = err?.status || err?.code;
        console.warn(`[Gemini API Warning] Model ${model} attempt ${attempt + 1} failed:`, errMsg);

        // If it's a temporary 503 high demand or 429 rate limit, wait slightly and retry or switch model
        if (errMsg.includes("503") || errMsg.includes("demand") || status === 503 || status === 429) {
          await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
          continue;
        } else {
          // For other errors, switch to next model immediately
          break;
        }
      }
    }
  }

  throw lastError || new Error("All Gemini models are currently busy. Please try again in a moment.");
}

// Fallback generator for 1-4 servings Dr. Galpin meal plan with exact TDEE and biometrics in case of complete external API outage
function generateDynamicGalpinFallback(
  servings: number, 
  fitnessGoal: string, 
  dietPreference: string,
  userBiometrics?: {
    height?: number;
    weight?: number;
    bodyFat?: number;
    age?: number;
    gender?: string;
    activityLevel?: string;
    bmr?: number;
    tdee?: number;
    targetCalories?: number;
    targetProteinG?: number;
    targetCarbsG?: number;
    targetFatsG?: number;
  }
) {
  const s = Math.min(Math.max(servings, 1), 4);
  const height = userBiometrics?.height || 172;
  const weight = userBiometrics?.weight || 68.5;
  const bodyFat = userBiometrics?.bodyFat || 21.5;
  const age = userBiometrics?.age || 29;
  const gender = userBiometrics?.gender || 'female';

  // Calculate default BMR & TDEE if not provided
  let bmr = userBiometrics?.bmr;
  if (!bmr) {
    if (bodyFat && bodyFat >= 5 && bodyFat <= 55) {
      const lbm = weight * (1 - bodyFat / 100);
      bmr = Math.round(370 + 21.6 * lbm);
    } else {
      bmr = gender === 'male' 
        ? Math.round(10 * weight + 6.25 * height - 5 * age + 5)
        : Math.round(10 * weight + 6.25 * height - 5 * age - 161);
    }
  }

  const tdee = userBiometrics?.tdee || Math.round(bmr * 1.375);
  
  let targetCal = userBiometrics?.targetCalories;
  let targetProt = userBiometrics?.targetProteinG;
  let targetCarb = userBiometrics?.targetCarbsG;
  let targetFat = userBiometrics?.targetFatsG;

  if (!targetCal || !targetProt || !targetCarb || !targetFat) {
    if (fitnessGoal.includes('增肌') || fitnessGoal.includes('Hypertrophy')) {
      targetCal = tdee + 300;
      targetProt = Math.round(weight * 2.0);
    } else if (fitnessGoal.includes('減脂') || fitnessGoal.includes('Fat Loss')) {
      targetCal = Math.max(tdee - 400, Math.round(bmr * 1.05));
      targetProt = Math.round(weight * 2.2);
    } else if (fitnessGoal.includes('運動表現') || fitnessGoal.includes('Performance')) {
      targetCal = tdee + 150;
      targetProt = Math.round(weight * 1.8);
    } else {
      targetCal = tdee;
      targetProt = Math.round(weight * 1.6);
    }
    const fatKcal = targetCal * 0.28;
    targetFat = Math.round(fatKcal / 9);
    const remKcal = Math.max(targetCal - (targetProt * 4) - (targetFat * 9), 200);
    targetCarb = Math.round(remKcal / 4);
  }

  const proteinRatioPercent = Math.round(((targetProt * 4) / targetCal) * 100);
  const carbsRatioPercent = Math.round(((targetCarb * 4) / targetCal) * 100);
  const fatsRatioPercent = 100 - proteinRatioPercent - carbsRatioPercent;
  const proteinPerKg = Number((targetProt / weight).toFixed(1));

  const chickenQty = `${(s * (targetProt > 130 ? 0.9 : 0.75)).toFixed(1)} kg（約${s * 3}-${s * 4}餐份）`;
  const eggsQty = `${s * 8} 顆（每人每天早晨 1-2 顆）`;
  const fishQty = `${s * 2} 片（挪威鮭魚/鯖魚）`;
  const tofuQty = `${Math.max(s * 1.5, 2)} 盒`;
  const oatsQty = `${s * 300} g（無糖大燕麥片）`;
  const sweetPotatoes = `${s * 4} 條（台農57號中型地瓜）`;

  return {
    servings: s,
    themeTitle: `Dr. Andy Galpin ${s}人份【${fitnessGoal}】7天全食物週期化菜單`,
    galpinSummary: `依據您的身高 ${height}cm、體重 ${weight}kg${bodyFat ? `、體脂 ${bodyFat}%` : ''}，計算 TDEE 為 ${tdee} kcal，規劃每日目標攝取 ${targetCal} kcal。三大營養素配置：蛋白質 ${targetProt}g (${proteinPerKg}g/kg)、低 GI 原型碳水 ${targetCarb}g、抗發炎優質油脂 ${targetFat}g，精準換算 ${s} 人份 7 天份量。`,
    nutritionTarget: {
      heightCm: height,
      weightKg: weight,
      bodyFatPercent: bodyFat,
      bmr,
      tdee,
      targetCalories: targetCal,
      targetProteinG: targetProt,
      targetCarbsG: targetCarb,
      targetFatsG: targetFat,
      proteinRatioPercent,
      carbsRatioPercent,
      fatsRatioPercent,
      proteinPerKg,
      galpinNotes: `每餐均勻分配約 ${Math.round(targetProt / 3.5)}g 高生物價蛋白質觸發亮氨酸 (Leucine) MPS 閾值，搭配低 GI 複合碳水維持胰島素與血糖穩定。`,
    },
    weeklyMealPlan: [
      {
        dayOfWeek: "週一",
        dayTitle: "亮氨酸閾值啟動日 (Leucine Trigger & MPS)",
        nutritionTip: "週一訓練重點在於每餐充足蛋白質 (30-45g) 刺激肌肉蛋白質合成，搭配高纖低 GI 地瓜補充肝醣。",
        totalCaloriesApprox: targetCal,
        totalProteinApprox: targetProt,
        totalCarbsApprox: targetCarb,
        totalFatsApprox: targetFat,
        breakfast: {
          name: "放牧水煮蛋搭酪梨黑麥全穀吐司",
          description: "2顆溫泉蛋/水煮蛋搭配半顆新鮮酪梨切片，淋上海鹽與特級初榨橄欖油。",
          caloriesApprox: Math.round(targetCal * 0.25),
          proteinApprox: Math.round(targetProt * 0.25),
          carbsApprox: Math.round(targetCarb * 0.25),
          fatsApprox: Math.round(targetFat * 0.28),
          tags: ["#MPS亮氨酸", "#低GI全碳水", "#好油脂Omega9"],
          ingredients: ["放牧雞蛋", "酪梨", "全穀吐司", "特級初榨橄欖油"]
        },
        lunch: {
          name: "炙烤迷迭香舒肥雞胸彩虹藜麥溫沙拉",
          description: "香草醃製舒肥雞胸肉切片，搭配蒸熟三色藜麥、綠花椰菜與牛番茄。",
          caloriesApprox: Math.round(targetCal * 0.35),
          proteinApprox: Math.round(targetProt * 0.35),
          carbsApprox: Math.round(targetCarb * 0.35),
          fatsApprox: Math.round(targetFat * 0.32),
          tags: ["#高生物價蛋白", "#蘿蔔硫素", "#粒線體抗氧化"],
          ingredients: ["雞胸肉", "三色藜麥", "綠花椰菜", "牛番茄", "特級初榨橄欖油"]
        },
        dinner: {
          name: "香煎薄鹽挪威鮭魚佐清蒸地瓜與蒜炒菠菜",
          description: "豐富 Omega-3 鮭魚排乾煎出天然魚油，搭配台農57號清蒸地瓜與富含鐵鎂的菠菜。",
          caloriesApprox: Math.round(targetCal * 0.3),
          proteinApprox: Math.round(targetProt * 0.3),
          carbsApprox: Math.round(targetCarb * 0.3),
          fatsApprox: Math.round(targetFat * 0.3),
          tags: ["#Omega3抗發炎", "#低GI原型澱粉", "#鎂離子舒壓"],
          ingredients: ["挪威鮭魚", "台農57號地瓜", "菠菜", "大蒜"]
        },
        snack: {
          name: "無糖希臘優格佐藍莓奇亞籽",
          description: "無糖純濃希臘優格 150g，拌入新鮮藍莓與奇亞籽，延緩夜間蛋白質分解。",
          caloriesApprox: Math.round(targetCal * 0.1),
          proteinApprox: Math.round(targetProt * 0.1),
          carbsApprox: Math.round(targetCarb * 0.1),
          fatsApprox: Math.round(targetFat * 0.1),
          tags: ["#酪蛋白慢釋放", "#花青素", "#腸道微生態"],
          ingredients: ["無糖希臘優格", "新鮮藍莓", "奇亞籽"]
        }
      },
      {
        dayOfWeek: "週二",
        dayTitle: "粒線體修復與細胞抗發炎日 (Mitochondrial & Anti-Inflammatory)",
        nutritionTip: "強化深海 Omega-3 與十字花科硫苷，減少高強度運動後的延遲性肌肉酸痛 (DOMS)。",
        totalCaloriesApprox: targetCal,
        totalProteinApprox: targetProt,
        totalCarbsApprox: targetCarb,
        totalFatsApprox: targetFat,
        breakfast: {
          name: "奇亞籽藍莓燕麥溫碗佐水煮蛋",
          description: "大燕麥片加無糖豆漿微波溫熱，撒上新鮮藍莓與奇亞籽，搭配1顆放牧蛋。",
          caloriesApprox: Math.round(targetCal * 0.25),
          proteinApprox: Math.round(targetProt * 0.24),
          carbsApprox: Math.round(targetCarb * 0.3),
          fatsApprox: Math.round(targetFat * 0.22),
          tags: ["#低GI燕麥", "#植物多酚", "#穩定晨間血糖"],
          ingredients: ["大燕麥片", "無糖高纖豆漿", "新鮮藍莓", "放牧雞蛋", "奇亞籽"]
        },
        lunch: {
          name: "香煎板豆腐與彩椒毛豆糙米便當",
          description: "金黃香煎板豆腐 1 塊，搭配冷藏備妥的川燙毛豆仁、紅黃彩椒與半碗糙米飯。",
          caloriesApprox: Math.round(targetCal * 0.34),
          proteinApprox: Math.round(targetProt * 0.34),
          carbsApprox: Math.round(targetCarb * 0.35),
          fatsApprox: Math.round(targetFat * 0.32),
          tags: ["#雙重植物蛋白", "#高纖維飽足", "#維生素C抗氧化"],
          ingredients: ["傳統板豆腐", "冷凍毛豆仁", "彩椒", "有機糙米", "特級初榨橄欖油"]
        },
        dinner: {
          name: "嫩煎蒜香雞里肌搭清炒綜合菇與南瓜塊",
          description: "低脂高蛋白雞里肌快炒雪白菇與鴻喜菇，搭配栗子南瓜蒸塊，天然多醣體提升免疫。",
          caloriesApprox: Math.round(targetCal * 0.31),
          proteinApprox: Math.round(targetProt * 0.34),
          carbsApprox: Math.round(targetCarb * 0.28),
          fatsApprox: Math.round(targetFat * 0.32),
          tags: ["#免疫多醣體", "#複合碳水", "#高蛋白修復"],
          ingredients: ["雞胸肉", "綜合菇類", "栗子南瓜", "大蒜", "特級初榨橄欖油"]
        },
        snack: {
          name: "綜合無調味堅果 (核桃/杏仁)",
          description: "手抓一把 (約25g) 綜合無調味堅果，補充維生素E與健康單元不飽和脂肪酸。",
          caloriesApprox: Math.round(targetCal * 0.1),
          proteinApprox: Math.round(targetProt * 0.08),
          carbsApprox: Math.round(targetCarb * 0.07),
          fatsApprox: Math.round(targetFat * 0.14),
          tags: ["#大腦神經修復", "#微量元素鋅鎂"],
          ingredients: ["綜合無調味堅果"]
        }
      },
      {
        dayOfWeek: "週三",
        dayTitle: "肌力爆發與神經肌肉充能日 (Neuromuscular Reload)",
        nutritionTip: "提供穩定的複合碳水化合物與電解質（鈉、鉀、鎂），支持中樞神經系統在高強度訓練下的傳導表現。",
        totalCaloriesApprox: targetCal,
        totalProteinApprox: targetProt,
        totalCarbsApprox: targetCarb,
        totalFatsApprox: targetFat,
        breakfast: {
          name: "雙蛋起司全麥菠菜捲餅",
          description: "全麥墨西哥捲餅皮包入2顆炒蛋、鮮嫩菠菜葉與少許切達起司。",
          caloriesApprox: Math.round(targetCal * 0.26),
          proteinApprox: Math.round(targetProt * 0.26),
          carbsApprox: Math.round(targetCarb * 0.24),
          fatsApprox: Math.round(targetFat * 0.28),
          tags: ["#高鈣高蛋白", "#快速備餐", "#神經傳導"],
          ingredients: ["全麥捲餅皮", "放牧雞蛋", "菠菜", "特級初榨橄欖油"]
        },
        lunch: {
          name: "香烤薄鹽鯖魚排搭蒸熟雙色地瓜與花椰菜",
          description: "富含天然 DHA/EPA 的烤鯖魚排，搭配清蒸地瓜與大量綠花椰菜。",
          caloriesApprox: Math.round(targetCal * 0.35),
          proteinApprox: Math.round(targetProt * 0.33),
          carbsApprox: Math.round(targetCarb * 0.35),
          fatsApprox: Math.round(targetFat * 0.35),
          tags: ["#EPA/DHA", "#高纖蘿蔔硫素", "#全食物護心"],
          ingredients: ["挪威鮭魚", "台農57號地瓜", "綠花椰菜", "檸檬"]
        },
        dinner: {
          name: "義式番茄羅勒嫩雞胸佐三色藜麥飯",
          description: "利用新鮮牛番茄與洋蔥熬煮醬汁，燉煮雞胸肉塊，搭配三色藜麥糙米飯。",
          caloriesApprox: Math.round(targetCal * 0.3),
          proteinApprox: Math.round(targetProt * 0.34),
          carbsApprox: Math.round(targetCarb * 0.31),
          fatsApprox: Math.round(targetFat * 0.27),
          tags: ["#茄紅素抗氧化", "#低脂增肌", "#腸道菌叢營養"],
          ingredients: ["雞胸肉", "牛番茄", "洋蔥", "三色藜麥", "特級初榨橄欖油"]
        },
        snack: {
          name: "切片青蘋果佐 100% 無加糖花生醬",
          description: "新鮮脆蘋果沾取 1 湯匙純花生醬，果膠纖維與健康油脂延緩飢餓感。",
          caloriesApprox: Math.round(targetCal * 0.09),
          proteinApprox: Math.round(targetProt * 0.07),
          carbsApprox: Math.round(targetCarb * 0.1),
          fatsApprox: Math.round(targetFat * 0.1),
          tags: ["#低GI水溶性纖維", "#天然單元不飽和脂肪"],
          ingredients: ["低GI水果(蘋果)", "無加糖花生醬"]
        }
      },
      {
        dayOfWeek: "週四",
        dayTitle: "多樣微量元素與海鮮高蛋白日 (Micronutrient & Ocean Protein)",
        nutritionTip: "白蝦仁與海鮮提供豐富牛磺酸與鋅離子，結合十字花科蔬菜促進肝臟第二階段排毒與代謝修復。",
        totalCaloriesApprox: targetCal,
        totalProteinApprox: targetProt,
        totalCarbsApprox: targetCarb,
        totalFatsApprox: targetFat,
        breakfast: {
          name: "高纖燕麥碗拌希臘優格與香蕉片",
          description: "大燕麥片泡熱水後拌入希臘優格與半根香蕉切片，補充天然鉀離子與水溶性纖維。",
          caloriesApprox: Math.round(targetCal * 0.25),
          proteinApprox: Math.round(targetProt * 0.25),
          carbsApprox: Math.round(targetCarb * 0.3),
          fatsApprox: Math.round(targetFat * 0.18),
          tags: ["#鉀離子平衡", "#晨間好心情血清素", "#飽足感"],
          ingredients: ["大燕麥片", "無糖希臘優格", "香蕉", "奇亞籽"]
        },
        lunch: {
          name: "蒜香橄欖油白蝦仁炒彩色甜椒佐糙米",
          description: "鮮甜生鮮白蝦仁佐大蒜與特級初榨橄欖油快炒，搭配彩椒與糙米飯。",
          caloriesApprox: Math.round(targetCal * 0.34),
          proteinApprox: Math.round(targetProt * 0.35),
          carbsApprox: Math.round(targetCarb * 0.34),
          fatsApprox: Math.round(targetFat * 0.32),
          tags: ["#極致低脂海鮮", "#天然牛磺酸", "#維生素C"],
          ingredients: ["生鮮白蝦仁", "彩椒", "大蒜", "有機糙米", "特級初榨橄欖油"]
        },
        dinner: {
          name: "香煎嫩豆腐佐迷迭香雞胸與清燙高麗菜",
          description: "雙重優質蛋白質組合（動植物均衡），搭配清甜高麗菜維持胃部黏膜健康。",
          caloriesApprox: Math.round(targetCal * 0.33),
          proteinApprox: Math.round(targetProt * 0.34),
          carbsApprox: Math.round(targetCarb * 0.28),
          fatsApprox: Math.round(targetFat * 0.38),
          tags: ["#動植物雙蛋白", "#維生素U護胃", "#低負擔修復"],
          ingredients: ["雞胸肉", "傳統板豆腐", "高麗菜", "特級初榨橄欖油"]
        },
        snack: {
          name: "蒸熟甜玉米筍沾海鹽與黑胡椒",
          description: "清脆爽口低熱量蔬菜點心，高纖維且富含胡蘿蔔素。",
          caloriesApprox: Math.round(targetCal * 0.08),
          proteinApprox: Math.round(targetProt * 0.06),
          carbsApprox: Math.round(targetCarb * 0.08),
          fatsApprox: Math.round(targetFat * 0.12),
          tags: ["#高纖脆口", "#超低熱量零食"],
          ingredients: ["玉米筍", "海鹽黑胡椒"]
        }
      },
      {
        dayOfWeek: "週五",
        dayTitle: "週末前代謝穩定與無負擔備餐日 (Metabolic Balance & Prep)",
        nutritionTip: "結束一週高壓工作，以高鎂、高抗氧化全食物幫助神經系統由交感轉為副交感放鬆模式。",
        totalCaloriesApprox: targetCal,
        totalProteinApprox: targetProt,
        totalCarbsApprox: targetCarb,
        totalFatsApprox: targetFat,
        breakfast: {
          name: "酪梨起司歐姆蛋佐牛番茄厚切",
          description: "2顆蛋打散煎成滑嫩歐姆蛋，包入酪梨丁與番茄切片，維持高飽足感與穩定晨間皮質醇。",
          caloriesApprox: Math.round(targetCal * 0.26),
          proteinApprox: Math.round(targetProt * 0.25),
          carbsApprox: Math.round(targetCarb * 0.2),
          fatsApprox: Math.round(targetFat * 0.34),
          tags: ["#皮質醇調節", "#優質膽固醇", "#無糖晨間"],
          ingredients: ["放牧雞蛋", "酪梨", "牛番茄", "特級初榨橄欖油"]
        },
        lunch: {
          name: "檸香舒肥雞胸肉佐蒸南瓜塊與綜合生菜",
          description: "清爽檸檬風味雞胸肉，搭配蒸南瓜與特級初榨橄欖油淋汁生菜。",
          caloriesApprox: Math.round(targetCal * 0.34),
          proteinApprox: Math.round(targetProt * 0.36),
          carbsApprox: Math.round(targetCarb * 0.35),
          fatsApprox: Math.round(targetFat * 0.28),
          tags: ["#低GI南瓜碳水", "#清爽無負擔", "#下午精神集中"],
          ingredients: ["雞胸肉", "栗子南瓜", "綜合生菜", "檸檬", "特級初榨橄欖油"]
        },
        dinner: {
          name: "味噌板豆腐海帶鮮魚湯搭糙米飯",
          description: "天然發酵味噌湯底加入鮭魚塊/鯖魚與嫩豆腐、海帶芽，補充天然益生元與微量碘離子。",
          caloriesApprox: Math.round(targetCal * 0.32),
          proteinApprox: Math.round(targetProt * 0.32),
          carbsApprox: Math.round(targetCarb * 0.36),
          fatsApprox: Math.round(targetFat * 0.26),
          tags: ["#天然發酵味噌", "#腸道好菌", "#溫熱安神睡眠"],
          ingredients: ["挪威鮭魚", "傳統板豆腐", "海帶芽", "有機糙米", "味噌"]
        },
        snack: {
          name: "薄鹽即食毛豆仁 1 小碗",
          description: "高纖維植物性蛋白質零嘴，解嘴饞且不影響晚餐胃口。",
          caloriesApprox: Math.round(targetCal * 0.08),
          proteinApprox: Math.round(targetProt * 0.07),
          carbsApprox: Math.round(targetCarb * 0.09),
          fatsApprox: Math.round(targetFat * 0.12),
          tags: ["#大豆異黃酮", "#天然高纖"],
          ingredients: ["冷凍毛豆仁"]
        }
      },
      {
        dayOfWeek: "週六",
        dayTitle: "週末長距離耐力與肝醣超補日 (Glycogen & Performance)",
        nutritionTip: "週末進行戶外長距離運動或大重量訓練，適度提升全食物碳水化合物比例，充填肌肉肝醣。",
        totalCaloriesApprox: targetCal,
        totalProteinApprox: targetProt,
        totalCarbsApprox: targetCarb,
        totalFatsApprox: targetFat,
        breakfast: {
          name: "香蕉肉桂燕麥藍莓高蛋白溫碗",
          description: "大燕麥片熱煮，拌入香蕉片、肉桂粉與 1 匙無糖蛋白粉或希臘優格，運動前絕佳充能。",
          caloriesApprox: Math.round(targetCal * 0.27),
          proteinApprox: Math.round(targetProt * 0.26),
          carbsApprox: Math.round(targetCarb * 0.34),
          fatsApprox: Math.round(targetFat * 0.18),
          tags: ["#肉桂穩定胰島素", "#運動前充能", "#高肝醣儲備"],
          ingredients: ["大燕麥片", "香蕉", "新鮮藍莓", "無糖希臘優格", "奇亞籽"]
        },
        lunch: {
          name: "地中海蒜香海鮮白蝦藜麥炒飯",
          description: "白蝦仁、透抽與煮熟三色藜麥、洋蔥、青蔥粒大火翻炒，色香味俱全。",
          caloriesApprox: Math.round(targetCal * 0.35),
          proteinApprox: Math.round(targetProt * 0.34),
          carbsApprox: Math.round(targetCarb * 0.35),
          fatsApprox: Math.round(targetFat * 0.34),
          tags: ["#地中海風全食物", "#耐力運動後修復", "#礦物質鋅"],
          ingredients: ["生鮮白蝦仁", "三色藜麥", "洋蔥", "特級初榨橄欖油", "青蔥"]
        },
        dinner: {
          name: "香煎薄鹽鯖魚佐烤地瓜與雙色花椰菜",
          description: "烤鯖魚搭配烤地瓜片與蒜香綠白雙色花椰菜，深層補充抗發炎油脂。",
          caloriesApprox: Math.round(targetCal * 0.3),
          proteinApprox: Math.round(targetProt * 0.32),
          carbsApprox: Math.round(targetCarb * 0.25),
          fatsApprox: Math.round(targetFat * 0.38),
          tags: ["#心血管防護", "#深度恢復", "#抗運動性氧化壓力"],
          ingredients: ["挪威鮭魚", "台農57號地瓜", "綠花椰菜", "大蒜", "特級初榨橄欖油"]
        },
        snack: {
          name: "奇亞籽無糖豆漿凍飲",
          description: "無糖高纖豆漿浸泡奇亞籽 10 分鐘，補充植物蛋白質與水溶性纖維。",
          caloriesApprox: Math.round(targetCal * 0.08),
          proteinApprox: Math.round(targetProt * 0.08),
          carbsApprox: Math.round(targetCarb * 0.06),
          fatsApprox: Math.round(targetFat * 0.1),
          tags: ["#植物高鈣高蛋白", "#飽足感"],
          ingredients: ["無糖高纖豆漿", "奇亞籽"]
        }
      },
      {
        dayOfWeek: "週日",
        dayTitle: "週末全食物大備餐與身心重設日 (Meal Prep & Deep Reset)",
        nutritionTip: "週日晚餐後可預先將下週所需之雞胸肉、地瓜與藜麥批次洗切分裝，下週週間備餐只要 10 分鐘！",
        totalCaloriesApprox: targetCal,
        totalProteinApprox: targetProt,
        totalCarbsApprox: targetCarb,
        totalFatsApprox: targetFat,
        breakfast: {
          name: "經典酪梨燻鮭魚或水煮蛋全麥三明治",
          description: "全麥吐司夾入半顆酪梨泥、2顆切片水煮蛋與牛番茄片，週末悠閒晨間儀式感。",
          caloriesApprox: Math.round(targetCal * 0.26),
          proteinApprox: Math.round(targetProt * 0.25),
          carbsApprox: Math.round(targetCarb * 0.25),
          fatsApprox: Math.round(targetFat * 0.3),
          tags: ["#週日早午餐", "#全食物防護", "#健康脂肪酸"],
          ingredients: ["全穀吐司", "酪梨", "放牧雞蛋", "牛番茄", "特級初榨橄欖油"]
        },
        lunch: {
          name: "香草大蒜嫩煎雞里肌佐烤甜椒與南瓜溫沙拉",
          description: "將整盤彩椒、南瓜與雞里肌一起進烤箱烤熟，省時美味且富含多樣類胡蘿蔔素。",
          caloriesApprox: Math.round(targetCal * 0.34),
          proteinApprox: Math.round(targetProt * 0.36),
          carbsApprox: Math.round(targetCarb * 0.35),
          fatsApprox: Math.round(targetFat * 0.28),
          tags: ["#一鍋出好菜", "#批次備餐典範", "#高蛋白飽足"],
          ingredients: ["雞胸肉", "彩椒", "栗子南瓜", "大蒜", "特級初榨橄欖油"]
        },
        dinner: {
          name: "清燉時蔬豆腐雞湯佐半碗糙米飯",
          description: "高麗菜、玉米筍、洋蔥與板豆腐、雞肉塊一同慢火燉煮，湯頭清甜回甘無負擔。",
          caloriesApprox: Math.round(targetCal * 0.31),
          proteinApprox: Math.round(targetProt * 0.32),
          carbsApprox: Math.round(targetCarb * 0.3),
          fatsApprox: Math.round(targetFat * 0.32),
          tags: ["#暖胃深層睡眠", "#全食物微量元素", "#週日收心餐"],
          ingredients: ["雞胸肉", "傳統板豆腐", "高麗菜", "洋蔥", "玉米筍", "有機糙米"]
        },
        snack: {
          name: "無糖希臘優格 1 小碗搭核桃堅果",
          description: "睡前 2 小時補充優質酪蛋白與核桃色胺酸，有助於褪黑激素生成與深層睡眠修復。",
          caloriesApprox: Math.round(targetCal * 0.09),
          proteinApprox: Math.round(targetProt * 0.07),
          carbsApprox: Math.round(targetCarb * 0.1),
          fatsApprox: Math.round(targetFat * 0.1),
          tags: ["#色胺酸助眠", "#夜間肌肉修復", "#天然神經放鬆"],
          ingredients: ["無糖希臘優格", "綜合無調味堅果"]
        }
      }
    ],
    groceryList: [
      {
        id: `ai_g_p1_${Date.now()}`,
        category: "protein",
        name: "生鮮冷藏雞胸肉 / 雞里肌肉",
        quantity: chickenQty,
        checked: false,
        notes: `每餐約 150-180g 提供 35g 蛋白質，可分裝冷藏`,
        mealUsage: ["週一午餐", "週二晚餐", "週三晚餐", "週四晚餐", "週五午餐", "週日午餐", "週日晚餐"]
      },
      {
        id: `ai_g_p2_${Date.now()}`,
        category: "protein",
        name: "優質全蛋 (放牧蛋/洗選蛋)",
        quantity: eggsQty,
        checked: false,
        notes: "富含卵磷脂、膽鹼與優質胺基酸",
        mealUsage: ["週一早餐", "週二早餐", "週三早餐", "週五早餐", "週日早餐"]
      },
      {
        id: `ai_g_p3_${Date.now()}`,
        category: "protein",
        name: "挪威鮭魚切片 / 薄鹽鯖魚排",
        quantity: fishQty,
        checked: false,
        notes: "富含高濃度 Omega-3 (EPA/DHA) 具強效抗發炎力",
        mealUsage: ["週一晚餐", "週三午餐", "週五晚餐", "週六晚餐"]
      },
      {
        id: `ai_g_p4_${Date.now()}`,
        category: "protein",
        name: "傳統板豆腐 / 嫩豆腐",
        quantity: tofuQty,
        checked: false,
        notes: "植物性蛋白、高鈣且熱量低",
        mealUsage: ["週二午餐", "週四晚餐", "週五晚餐", "週日晚餐"]
      },
      {
        id: `ai_g_p5_${Date.now()}`,
        category: "protein",
        name: "冷凍即食薄鹽毛豆仁",
        quantity: `${s * 250} g (約${Math.max(Math.ceil(s/2), 1)}包)`,
        checked: false,
        notes: "優質植物高蛋白點心與配菜",
        mealUsage: ["週二午餐", "週五點心"]
      },
      {
        id: `ai_g_p6_${Date.now()}`,
        category: "protein",
        name: "生鮮白蝦仁 / 透抽",
        quantity: `${s * 200} g`,
        checked: false,
        notes: "極低脂高蛋白，富含牛磺酸與鋅",
        mealUsage: ["週四午餐", "週六午餐"]
      },
      {
        id: `ai_g_p7_${Date.now()}`,
        category: "protein",
        name: "無糖純濃希臘優格 (Greek Yogurt)",
        quantity: `${s * 500} g (${s} 大罐)`,
        checked: false,
        notes: "富含酪蛋白與益生菌，適合晨間或睡前點心",
        mealUsage: ["週一點心", "週四早餐", "週六早餐", "週日點心"]
      },
      {
        id: `ai_g_v1_${Date.now()}`,
        category: "vegetable",
        name: "綠花椰菜 (青花菜)",
        quantity: `${s * 2} 顆`,
        checked: false,
        notes: "富含蘿蔔硫素與葉黃素，川燙或清炒皆宜",
        mealUsage: ["週一午餐", "週三午餐", "週六晚餐"]
      },
      {
        id: `ai_g_v2_${Date.now()}`,
        category: "vegetable",
        name: "有機嫩菠菜 / 深綠色葉菜",
        quantity: `${s * 2} 包`,
        checked: false,
        notes: "富含天然鎂離子、葉酸與鐵質",
        mealUsage: ["週一晚餐", "週三早餐"]
      },
      {
        id: `ai_g_v3_${Date.now()}`,
        category: "vegetable",
        name: "彩色甜椒 (紅黃甜椒)",
        quantity: `${s * 3} 顆`,
        checked: false,
        notes: "維生素C含量高於柑橘，強抗氧化",
        mealUsage: ["週二午餐", "週四午餐", "週日午餐"]
      },
      {
        id: `ai_g_v4_${Date.now()}`,
        category: "vegetable",
        name: "牛番茄",
        quantity: `${s * 4} 顆`,
        checked: false,
        notes: "含豐富脂溶性茄紅素，需配合好油炒煮吸收",
        mealUsage: ["週一午餐", "週三晚餐", "週五早餐", "週日早餐"]
      },
      {
        id: `ai_g_v5_${Date.now()}`,
        category: "vegetable",
        name: "高麗菜",
        quantity: `${s <= 2 ? '半顆至1顆' : '1-2顆'}`,
        checked: false,
        notes: "含維生素U可保護腸胃黏膜",
        mealUsage: ["週四晚餐", "週日晚餐"]
      },
      {
        id: `ai_g_c1_${Date.now()}`,
        category: "carb",
        name: "台農57號黃地瓜 / 紫地瓜",
        quantity: sweetPotatoes,
        checked: false,
        notes: "低GI全碳水，清蒸冷藏抗性澱粉更高",
        mealUsage: ["週一晚餐", "週三午餐", "週六晚餐"]
      },
      {
        id: `ai_g_c2_${Date.now()}`,
        category: "carb",
        name: "無糖大燕麥片 (Rolled Oats)",
        quantity: oatsQty,
        checked: false,
        notes: "富含β-葡聚醣，穩定餐後血糖與胰島素",
        mealUsage: ["週二早餐", "週四早餐", "週六早餐"]
      },
      {
        id: `ai_g_c3_${Date.now()}`,
        category: "carb",
        name: "三色有機藜麥 / 有機糙米",
        quantity: `${s * 300} g`,
        checked: false,
        notes: "全套完整必需胺基酸與豐富膳食纖維",
        mealUsage: ["週一午餐", "週二午餐", "週三晚餐", "週四午餐", "週六午餐"]
      },
      {
        id: `ai_g_c4_${Date.now()}`,
        category: "carb",
        name: "栗子南瓜",
        quantity: `${Math.max(Math.ceil(s/2), 1)} 顆`,
        checked: false,
        notes: "含豐富β-胡蘿蔔素與鉀，清甜可口",
        mealUsage: ["週二晚餐", "週五午餐", "週日午餐"]
      },
      {
        id: `ai_g_f1_${Date.now()}`,
        category: "fat_seasoning",
        name: "特級初榨冷壓橄欖油 (EVOO)",
        quantity: "1 瓶 (500ml)",
        checked: false,
        notes: "高單元不飽和脂肪酸 (Omega-9)，冷拌或中小火烹調",
        mealUsage: ["每日烹調與沙拉淋油"]
      },
      {
        id: `ai_g_f2_${Date.now()}`,
        category: "fat_seasoning",
        name: "進口新鮮酪梨 (Avocado)",
        quantity: `${s * 2} 顆`,
        checked: false,
        notes: "護心健康油脂與鉀，切丁搭配早餐或吐司",
        mealUsage: ["週一早餐", "週五早餐", "週日早餐"]
      },
      {
        id: `ai_g_f3_${Date.now()}`,
        category: "fat_seasoning",
        name: "綜合無調味堅果 (核桃/杏仁/腰果)",
        quantity: `${s * 150} g`,
        checked: false,
        notes: "核桃含植物性 Omega-3 (ALA)，每日一小把",
        mealUsage: ["週二點心", "週日點心"]
      },
      {
        id: `ai_g_f4_${Date.now()}`,
        category: "fat_seasoning",
        name: "有機黑奇亞籽 (Chia Seeds)",
        quantity: "1 包 (250g)",
        checked: false,
        notes: "高纖遇水膨脹，延緩胃排空與吸收",
        mealUsage: ["週一點心", "週二早餐", "週六點心"]
      },
      {
        id: `ai_g_fr1_${Date.now()}`,
        category: "fruit_beverage",
        name: "新鮮野生藍莓 / 綜合莓果",
        quantity: `${s * 2} 盒`,
        checked: false,
        notes: "高花青素低GI水果，大腦抗氧化神物",
        mealUsage: ["週一點心", "週二早餐", "週六早餐"]
      },
      {
        id: `ai_g_fr2_${Date.now()}`,
        category: "fruit_beverage",
        name: "新鮮香蕉 (黃綠香蕉)",
        quantity: `${s * 4} 根`,
        checked: false,
        notes: "運動前後迅速補充肝醣與電解質鉀",
        mealUsage: ["週四早餐", "週六早餐"]
      },
      {
        id: `ai_g_fr3_${Date.now()}`,
        category: "fruit_beverage",
        name: "無糖高纖豆漿",
        quantity: `${s * 1000} ml`,
        checked: false,
        notes: "補充水分與大豆卵磷脂",
        mealUsage: ["週二早餐", "週六點心"]
      }
    ]
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body Parser with ample limit for batch CSV/questions
  app.use(express.json({ limit: "10mb" }));

  // Initialize Gemini AI Client securely server-side
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Server-side AI Translation endpoint for Question DB Items
  app.post("/api/gemini/translate-questions", async (req, res) => {
    try {
      const { questions, targetLanguage, targetLanguageName } = req.body;

      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ error: "No questions provided for translation" });
      }

      const langName = targetLanguageName || targetLanguage || "English";

      const systemInstruction = `You are a medical, health accounting, and exercise physiology translator specializing in Dr. Andy Galpin's human performance principles.
Translate the provided health questionnaire items into ${langName} accurately.
Maintain precise health terminology (e.g. mTOR, Zone 2, Mitochondrial Biogenesis, Circadian Rhythm, Electrolytes, Glycemic Index).
Keep the boolean/accounting nature (assets/liabilities) intact. Return a JSON array matching the exact structure.`;

      const prompt = `Translate the following health question items into ${langName}.
Keep all question_id, category, type, attribute, and weight values exactly as they are.
Only translate question_text, galpin_principle, description, and tip into natural, high-quality ${langName}.

Input items:
${JSON.stringify(questions, null, 2)}`;

      const { text: responseText } = await generateWithModelFallback(ai, {
        systemInstruction,
        prompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question_id: { type: Type.STRING },
              category: { type: Type.STRING },
              type: { type: Type.STRING },
              question_text: { type: Type.STRING },
              attribute: { type: Type.STRING },
              weight: { type: Type.NUMBER },
              galpin_principle: { type: Type.STRING },
              description: { type: Type.STRING },
              tip: { type: Type.STRING },
              isCustom: { type: Type.BOOLEAN },
              packId: { type: Type.STRING },
            },
            required: ["question_id", "category", "question_text", "attribute", "weight", "galpin_principle"],
          },
        },
      });

      if (!responseText) {
        throw new Error("Empty response from Gemini translation model");
      }

      const translatedQuestions = JSON.parse(responseText);
      return res.json({ success: true, translatedQuestions });
    } catch (err: any) {
      console.error("AI Translation Error:", err);
      return res.status(500).json({ 
        error: "Translation failed", 
        message: err.message || "Unknown error occurred" 
      });
    }
  });

  // Server-side AI Translation endpoint for general text / CSV content
  app.post("/api/gemini/translate-text", async (req, res) => {
    try {
      const { text, targetLanguage, targetLanguageName } = req.body;

      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Missing text to translate" });
      }

      const langName = targetLanguageName || targetLanguage || "English";

      const { text: translatedText } = await generateWithModelFallback(ai, {
        prompt: `Translate the following health and wellness text into natural, professional ${langName}. Preserve formatting and markdown if present:\n\n${text}`,
      });

      return res.json({ success: true, translatedText });
    } catch (err: any) {
      console.error("AI Text Translation Error:", err);
      return res.status(500).json({ 
        error: "Text translation failed", 
        message: err.message || "Unknown error" 
      });
    }
  });

  // Server-side AI Meal Plan & Synchronized Grocery Generator based on Dr. Andy Galpin's Principles
  const handleMealPlanRequest = async (req: express.Request, res: express.Response) => {
    const { 
      servings = 2, 
      fitnessGoal = "增肌修復與代謝優化", 
      dietPreference = "原型全食物均衡", 
      specialNotes = "",
      language = "zh-TW",
      userBiometrics,
    } = req.body;

    const validServings = Math.min(Math.max(Number(servings) || 1, 1), 4);
    
    // Extract & calculate physiological baselines
    const height = Number(userBiometrics?.height) || 172;
    const weight = Number(userBiometrics?.weight) || 68.5;
    const bodyFat = userBiometrics?.bodyFat ? Number(userBiometrics.bodyFat) : undefined;
    const age = Number(userBiometrics?.age) || 29;
    const gender = userBiometrics?.gender || 'female';
    const activityLevel = userBiometrics?.activityLevel || 'light';

    let bmr = Number(userBiometrics?.bmr);
    if (!bmr || isNaN(bmr)) {
      if (bodyFat && bodyFat >= 5 && bodyFat <= 55) {
        const lbm = weight * (1 - bodyFat / 100);
        bmr = Math.round(370 + 21.6 * lbm);
      } else {
        bmr = gender === 'male'
          ? Math.round(10 * weight + 6.25 * height - 5 * age + 5)
          : Math.round(10 * weight + 6.25 * height - 5 * age - 161);
      }
    }

    const multipliers: Record<string, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      very_active: 1.725
    };
    const tdee = Number(userBiometrics?.tdee) || Math.round(bmr * (multipliers[activityLevel] || 1.375));

    let targetCal = Number(userBiometrics?.targetCalories);
    let targetProt = Number(userBiometrics?.targetProteinG);
    let targetCarb = Number(userBiometrics?.targetCarbsG);
    let targetFat = Number(userBiometrics?.targetFatsG);

    if (!targetCal || isNaN(targetCal)) {
      if (fitnessGoal.includes('增肌') || fitnessGoal.includes('Hypertrophy')) {
        targetCal = tdee + 300;
        targetProt = Math.round(weight * 2.0);
      } else if (fitnessGoal.includes('減脂') || fitnessGoal.includes('Fat Loss')) {
        targetCal = Math.max(tdee - 400, Math.round(bmr * 1.05));
        targetProt = Math.round(weight * 2.2);
      } else if (fitnessGoal.includes('運動表現') || fitnessGoal.includes('Performance')) {
        targetCal = tdee + 150;
        targetProt = Math.round(weight * 1.8);
      } else {
        targetCal = tdee;
        targetProt = Math.round(weight * 1.6);
      }
      const fatKcal = targetCal * 0.28;
      targetFat = Math.round(fatKcal / 9);
      const remKcal = Math.max(targetCal - (targetProt * 4) - (targetFat * 9), 240);
      targetCarb = Math.round(remKcal / 4);
    }

    const biometricsPayload = {
      height,
      weight,
      bodyFat,
      age,
      gender,
      activityLevel,
      bmr,
      tdee,
      targetCalories: targetCal,
      targetProteinG: targetProt,
      targetCarbsG: targetCarb,
      targetFatsG: targetFat
    };

    try {
      const systemInstruction = `You are a world-class sports nutrition scientist and exercise physiologist specializing in Dr. Andy Galpin's Human Performance, Nutrition, and Muscle Physiology principles.
You design realistic, delicious, 100% whole-food 7-day meal plans (Monday to Sunday) and a matching, completely synchronized weekly supermarket grocery checklist for ${validServings} person(s).

Dr. Andy Galpin's Personalized Energy & Macronutrient Framework:
1. Individualized TDEE & Caloric Target: The primary user's height is ${height}cm, weight is ${weight}kg${bodyFat ? `, body fat is ${bodyFat}%` : ''}. BMR is ${bmr} kcal, TDEE is ${tdee} kcal.
   - Prescribed Daily Caloric Target: ~${targetCal} kcal/day per individual.
   - Macronutrient Targets (per person/day):
     * Protein: ~${targetProt}g/day (~${(targetProt / weight).toFixed(1)}g/kg) - Distribute evenly (30-45g/meal) to reliably surpass the Leucine trigger for Muscle Protein Synthesis (MPS).
     * Carbohydrates: ~${targetCarb}g/day (low-GI whole complex carbs: oats, sweet potatoes, quinoa, brown rice, squash, berries) to replenish muscle glycogen and prevent cognitive fatigue.
     * Healthy Fats: ~${targetFat}g/day (anti-inflammatory Omega-3s, extra virgin olive oil, avocado, nuts) for cellular membranes and hormone synthesis.
2. Exact Grocery Scaling: The grocery items MUST be scaled precisely to ${validServings} serving(s) for 7 full days with practical Taiwanese/modern supermarket packaging units (e.g. 1 person = 0.8-1.0kg chicken, 4 persons = 3.2-3.8kg chicken; eggs and produce scaled accordingly).
3. 100% Synchronization: Every ingredient used in the 7 days of meals MUST have a corresponding grocery item, and every grocery item must list its usage in mealUsage.
4. Nutritional Integrity: Provide realistic macro estimates per meal and day (caloriesApprox, proteinApprox, carbsApprox, fatsApprox) that closely align with the individual target of ~${targetCal} kcal and ${targetProt}g protein.

Return valid JSON in the requested language (${language}) matching the schema precisely.`;

      const prompt = `Generate an individualized Dr. Andy Galpin 7-day meal plan (週一 to 週日) and a synchronized grocery checklist for ${validServings} 人份 (${validServings} servings).
User Biometrics & Macro Targets:
- Height: ${height} cm | Weight: ${weight} kg | Body Fat: ${bodyFat ? `${bodyFat}%` : '未提供'}
- BMR: ${bmr} kcal | TDEE: ${tdee} kcal
- Daily Target Calories: ${targetCal} kcal
- Daily Macronutrients Target: Protein ${targetProt}g, Low-GI Carbs ${targetCarb}g, Anti-inflammatory Fats ${targetFat}g
- Goal: ${fitnessGoal}
- Diet Preference: ${dietPreference}
- Additional User Notes: ${specialNotes || '無特殊限制'}
- Number of Servings: ${validServings} 人份

Requirements:
- nutritionTarget: Return the exact calculated biometrics and macro goals.
- weeklyMealPlan: Exactly 7 items for 週一 to 週日. Each day must include dayTitle, nutritionTip, totalCaloriesApprox, totalProteinApprox, totalCarbsApprox, totalFatsApprox, breakfast, lunch, dinner, snack. Each meal needs name, description, caloriesApprox (per serving), proteinApprox (per serving in grams), carbsApprox, fatsApprox, tags (e.g. #MPS亮氨酸, #Omega3, #低GI原型, #抗發炎, #粒線體修復), and ingredients (array of ingredient names).
- groceryList: Categorized into 'protein', 'vegetable', 'carb', 'fat_seasoning', 'fruit_beverage'. Provide accurate total quantity scaled for ${validServings} 人份 for the whole week, notes (storage/prep tips), and mealUsage (e.g. ["週一午餐", "週三晚餐", ...]).
- themeTitle: An inspiring title reflecting the Galpin protocol, individualized TDEE calories (${targetCal} kcal), and servings.
- galpinSummary: A concise 2-3 sentence scientific summary explaining how this plan matches the user's TDEE of ${tdee} kcal, fulfills the ${targetProt}g protein leucine threshold, and provides ${validServings} person(s) with synchronized whole-food nutrition.`;

      const { text: responseText, modelUsed } = await generateWithModelFallback(ai, {
        systemInstruction,
        prompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            servings: { type: Type.INTEGER },
            themeTitle: { type: Type.STRING },
            galpinSummary: { type: Type.STRING },
            nutritionTarget: {
              type: Type.OBJECT,
              properties: {
                heightCm: { type: Type.NUMBER },
                weightKg: { type: Type.NUMBER },
                bodyFatPercent: { type: Type.NUMBER },
                bmr: { type: Type.NUMBER },
                tdee: { type: Type.NUMBER },
                targetCalories: { type: Type.NUMBER },
                targetProteinG: { type: Type.NUMBER },
                targetCarbsG: { type: Type.NUMBER },
                targetFatsG: { type: Type.NUMBER },
                proteinRatioPercent: { type: Type.NUMBER },
                carbsRatioPercent: { type: Type.NUMBER },
                fatsRatioPercent: { type: Type.NUMBER },
                proteinPerKg: { type: Type.NUMBER },
                galpinNotes: { type: Type.STRING },
              },
              required: ["heightCm", "weightKg", "bmr", "tdee", "targetCalories", "targetProteinG", "targetCarbsG", "targetFatsG"]
            },
            weeklyMealPlan: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  dayOfWeek: { type: Type.STRING },
                  dayTitle: { type: Type.STRING },
                  nutritionTip: { type: Type.STRING },
                  totalCaloriesApprox: { type: Type.NUMBER },
                  totalProteinApprox: { type: Type.NUMBER },
                  totalCarbsApprox: { type: Type.NUMBER },
                  totalFatsApprox: { type: Type.NUMBER },
                  breakfast: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      description: { type: Type.STRING },
                      caloriesApprox: { type: Type.NUMBER },
                      proteinApprox: { type: Type.NUMBER },
                      carbsApprox: { type: Type.NUMBER },
                      fatsApprox: { type: Type.NUMBER },
                      tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                      ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                    required: ["name", "description", "caloriesApprox", "proteinApprox", "tags", "ingredients"],
                  },
                  lunch: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      description: { type: Type.STRING },
                      caloriesApprox: { type: Type.NUMBER },
                      proteinApprox: { type: Type.NUMBER },
                      carbsApprox: { type: Type.NUMBER },
                      fatsApprox: { type: Type.NUMBER },
                      tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                      ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                    required: ["name", "description", "caloriesApprox", "proteinApprox", "tags", "ingredients"],
                  },
                  dinner: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      description: { type: Type.STRING },
                      caloriesApprox: { type: Type.NUMBER },
                      proteinApprox: { type: Type.NUMBER },
                      carbsApprox: { type: Type.NUMBER },
                      fatsApprox: { type: Type.NUMBER },
                      tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                      ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                    required: ["name", "description", "caloriesApprox", "proteinApprox", "tags", "ingredients"],
                  },
                  snack: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      description: { type: Type.STRING },
                      caloriesApprox: { type: Type.NUMBER },
                      proteinApprox: { type: Type.NUMBER },
                      carbsApprox: { type: Type.NUMBER },
                      fatsApprox: { type: Type.NUMBER },
                      tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                      ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                    required: ["name", "description", "caloriesApprox", "proteinApprox", "tags", "ingredients"],
                  },
                },
                required: ["dayOfWeek", "dayTitle", "nutritionTip", "breakfast", "lunch", "dinner", "snack"],
              },
            },
            groceryList: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  category: { type: Type.STRING },
                  name: { type: Type.STRING },
                  quantity: { type: Type.STRING },
                  checked: { type: Type.BOOLEAN },
                  notes: { type: Type.STRING },
                  mealUsage: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["id", "category", "name", "quantity", "checked"],
              },
            },
          },
          required: ["servings", "themeTitle", "galpinSummary", "weeklyMealPlan", "groceryList"],
        },
      });

      if (!responseText) {
        throw new Error("Empty response from Gemini AI meal planner model");
      }

      const generatedPlan = JSON.parse(responseText);

      // Ensure ids and default checked states
      if (Array.isArray(generatedPlan.groceryList)) {
        generatedPlan.groceryList = generatedPlan.groceryList.map((item: any, idx: number) => ({
          ...item,
          id: item.id || `ai_g_${Date.now()}_${idx}`,
          checked: false,
          category: ['protein', 'vegetable', 'carb', 'fat_seasoning', 'fruit_beverage'].includes(item.category)
            ? item.category
            : 'protein',
        }));
      }

      return res.json({ 
        success: true, 
        data: generatedPlan,
        modelUsed 
      });
    } catch (err: any) {
      console.warn("AI Meal Generation Online Service Unavailable, falling back to dynamic Galpin generator:", err?.message);
      // Graceful fallback to guaranteed Dr. Andy Galpin 1-4 servings plan with exact biometric math
      const fallbackPlan = generateDynamicGalpinFallback(validServings, fitnessGoal, dietPreference, biometricsPayload);
      return res.json({
        success: true,
        data: fallbackPlan,
        isFallback: true,
        fallbackReason: "Google Gemini 服務暫時處於高負載尖峰，已為您無縫啟動 Dr. Andy Galpin 智能生理換算備案。"
      });
    }
  };

  app.post("/api/gemini/generate-meal-and-grocery", handleMealPlanRequest);
  app.post("/api/generate-meal-and-grocery", handleMealPlanRequest);
  app.post("/api/gemini/generate-meal-plan", handleMealPlanRequest);
  app.post("/api/generate-meal-plan", handleMealPlanRequest);

  // Vite middleware for development vs static build for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Health Balance Sheet Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
