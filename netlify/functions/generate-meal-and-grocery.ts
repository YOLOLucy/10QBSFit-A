import { GoogleGenAI, Type } from "@google/genai";

// Resilient helper to parse JSON even if surrounded with markdown or formatting
function extractJsonFromText(rawText: string): any {
  let cleaned = (rawText || "").trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```\s*$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/```\s*$/, "");
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Unable to parse structured JSON from AI output");
  }
}

export const handler = async (event: any, context: any) => {
  // Handle CORS Preflight
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({ 
          error: "GEMINI_API_KEY is not configured on Netlify environment variables",
          hint: "Please add GEMINI_API_KEY in Netlify Site Configuration -> Environment Variables"
        }),
      };
    }

    const ai = new GoogleGenAI({ apiKey });
    const reqBody = event.body ? JSON.parse(event.body) : {};

    const {
      servings = 1,
      fitnessGoal = "增肌與運動表現 (MPS 亮氨酸最大化)",
      dietPreference = "原型全食物均衡飲食",
      specialNotes = "",
      pastedGoogleResult = "",
      combinedGoogleQuery = "",
      biometrics = {},
      language = "zh-TW"
    } = reqBody;

    const validServings = Math.max(1, Math.min(Number(servings) || 1, 4));
    const height = Number(biometrics?.height) || 170;
    const weight = Number(biometrics?.weight) || 65;
    const bodyFat = biometrics?.bodyFat ? Number(biometrics.bodyFat) : undefined;
    const age = Number(biometrics?.age) || 30;
    const gender = biometrics?.gender || 'female';
    const activityLevel = biometrics?.activityLevel || 'moderately_active';

    const bmr = Number(biometrics?.bmr) || Math.round(10 * weight + 6.25 * height - 5 * age + (gender === 'male' ? 5 : -161));
    const tdee = Number(biometrics?.tdee) || Math.round(bmr * 1.55);
    
    let targetCal = Number(biometrics?.targetCalories) || tdee;
    let targetProt = Number(biometrics?.targetProteinG) || Math.round(weight * 2.0);
    let targetCarb = Number(biometrics?.targetCarbsG) || 0;
    let targetFat = Number(biometrics?.targetFatsG) || 0;

    if (!targetCarb || !targetFat) {
      const fatKcal = targetCal * 0.28;
      targetFat = Math.round(fatKcal / 9);
      const remKcal = Math.max(targetCal - (targetProt * 4) - (targetFat * 9), 240);
      targetCarb = Math.round(remKcal / 4);
    }

    const systemInstruction = `You are a world-class sports nutrition scientist and exercise physiologist specializing in Dr. Andy Galpin's Human Performance, Nutrition, and Muscle Physiology principles.
You design realistic, delicious, 100% whole-food 7-day meal plans (Monday to Sunday) and a matching, completely synchronized weekly supermarket grocery checklist for ${validServings} person(s).

Dr. Andy Galpin's Personalized Energy & Macronutrient Framework:
1. Individualized TDEE & Caloric Target: The primary user's height is ${height}cm, weight is ${weight}kg. BMR is ${bmr} kcal, TDEE is ${tdee} kcal.
   - Prescribed Daily Caloric Target: ~${targetCal} kcal/day per individual.
   - Macronutrient Targets (per person/day):
     * Protein: ~${targetProt}g/day (~${(targetProt / weight).toFixed(1)}g/kg) - Distribute evenly (30-45g/meal) to reliably surpass the Leucine trigger for Muscle Protein Synthesis (MPS).
     * Carbohydrates: ~${targetCarb}g/day (low-GI whole complex carbs)
     * Healthy Fats: ~${targetFat}g/day (anti-inflammatory Omega-3s, extra virgin olive oil, nuts)
2. Exact Grocery Scaling: The grocery items MUST be scaled precisely to ${validServings} serving(s) for 7 full days.
3. 100% Synchronization: Every ingredient used in the 7 days of meals MUST have a corresponding grocery item.

Return valid JSON in the requested language (${language}) matching the schema precisely.`;

    const varietyThemes = [
      "地中海香草海鮮與抗發炎彩虹蔬食（主打鱸魚/干貝大蝦/酪梨/彩椒鷹嘴豆/特級初榨橄欖油）",
      "日式和風原味高蛋白與紫米甘藷（主打鹽麴鮭魚/毛豆板豆腐/溫野菜/紫米糙米/味噌海苔）",
      "香烤迷迭香舒肥全食物能量餐（主打香草烤雞腿/慢烤牛腱/栗子南瓜/雙色藜麥/大蒜野菇）",
      "鮮蝦酪梨與高纖豆類修復餐（主打草蝦仁/酪梨/黑豆/水蓮甜椒/台農57號地瓜）",
      "北歐極簡深海魚油與莓果能量餐（主打挪威鯖魚/蒔蘿嫩魚/藍莓奇亞籽希臘優格/大燕麥）",
      "普羅旺斯彩椒燉菜與精瘦紅肉充能餐（主打精瘦牛里肌/櫛瓜番茄燉菜/非基改厚豆乾/紅藜飯）"
    ];
    const randomTheme = varietyThemes[Math.floor(Math.random() * varietyThemes.length)];
    const randomSeed = Math.floor(Math.random() * 90000) + 10000;

    const prompt = `依安迪·加爾平 (Dr. Andy Galpin) 的運動生理理論設計一週菜單，並將所需食材 100% 完整整合進一週菜單及採買清單。

Google 問問 AI 核心檢索公式：
${combinedGoogleQuery ? `【${combinedGoogleQuery}】` : `【依安迪·加爾平的理論設計一週菜單 + 身高${height}cm 體重${weight}kg TDEE ${tdee}kcal + 用餐人數${validServings}人 + ${fitnessGoal} + ${dietPreference}】`}

- 人數規格：${validServings} 人份 (${validServings} servings)
- 本次隨機輪替菜色風格重點（隨機種子 #${randomSeed}）：【${randomTheme}】
- 個人生理數值與目標熱量：
  * 身高: ${height} cm | 體重: ${weight} kg
  * 基礎代謝 BMR: ${bmr} kcal | 每日總消耗 TDEE: ${tdee} kcal
  * 每日目標總熱量: ${targetCal} kcal/日
  * 三大營養素分配: 蛋白質 ~${targetProt}g, 低GI複合碳水 ~${targetCarb}g, 優質好脂肪 ~${targetFat}g
- 目標設定: ${fitnessGoal}
- 飲食偏好: ${dietPreference}
- 特殊備註與靈感需求: ${specialNotes || '無特殊限制'}

請嚴格輸出 JSON 格式：
1. themeTitle: 標明【Google 問問 AI：依加爾平理論設計之 ${targetCal}kcal 菜單 (${validServings}人份)】
2. galpinSummary: 運動生理學摘要
3. weeklyMealPlan: 週一至週日共 7 天完整的早、午、晚、點心營養規劃（含 name, description, caloriesApprox, proteinApprox, carbsApprox, fatsApprox, tags, ingredients）。
4. groceryList: 完整整合一週 7 天菜單所使用到的【所有原型食材】，依 ${validServings} 人份等比放大採買量。`;

    const candidateModels = ["gemini-2.5-flash", "gemini-3.1-flash-lite", "gemini-3.7-flash"];
    let parsedData: any = null;
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.95,
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
                  },
                },
                weeklyMealPlan: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      dayIndex: { type: Type.INTEGER },
                      dayName: { type: Type.STRING },
                      themeOfDay: { type: Type.STRING },
                      dailyCalories: { type: Type.NUMBER },
                      dailyProteinG: { type: Type.NUMBER },
                      dailyCarbsG: { type: Type.NUMBER },
                      dailyFatsG: { type: Type.NUMBER },
                      meals: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            mealType: { type: Type.STRING },
                            name: { type: Type.STRING },
                            description: { type: Type.STRING },
                            caloriesApprox: { type: Type.NUMBER },
                            proteinApprox: { type: Type.NUMBER },
                            carbsApprox: { type: Type.NUMBER },
                            fatsApprox: { type: Type.NUMBER },
                            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                            ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
                          },
                          required: ["mealType", "name", "caloriesApprox", "proteinApprox", "carbsApprox", "fatsApprox", "ingredients"],
                        },
                      },
                    },
                    required: ["dayIndex", "dayName", "dailyCalories", "dailyProteinG", "dailyCarbsG", "dailyFatsG", "meals"],
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
                      amountForServings: { type: Type.STRING },
                      estimatedCostTWD: { type: Type.NUMBER },
                      mealUsage: { type: Type.ARRAY, items: { type: Type.STRING } },
                      storageTip: { type: Type.STRING },
                    },
                    required: ["id", "category", "name", "amountForServings", "estimatedCostTWD", "mealUsage"],
                  },
                },
              },
              required: ["servings", "themeTitle", "galpinSummary", "weeklyMealPlan", "groceryList"],
            },
          },
        });

        if (response && response.text) {
          parsedData = extractJsonFromText(response.text);
          break;
        }
      } catch (err: any) {
        lastError = err;
        continue;
      }
    }

    if (!parsedData) {
      throw lastError || new Error("Failed to generate meal plan with Gemini API");
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: parsedData,
      }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: err?.message || String(err),
      }),
    };
  }
};
