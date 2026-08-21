import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

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

      // Prompt model using gemini-3.7-flash with structured JSON response
      const systemInstruction = `You are a medical, health accounting, and exercise physiology translator specializing in Dr. Andy Galpin's human performance principles.
Translate the provided health questionnaire items into ${langName} accurately.
Maintain precise health terminology (e.g. mTOR, Zone 2, Mitochondrial Biogenesis, Circadian Rhythm, Electrolytes, Glycemic Index).
Keep the boolean/accounting nature (assets/liabilities) intact. Return a JSON array matching the exact structure.`;

      const prompt = `Translate the following health question items into ${langName}.
Keep all question_id, category, type, attribute, and weight values exactly as they are.
Only translate question_text, galpin_principle, description, and tip into natural, high-quality ${langName}.

Input items:
${JSON.stringify(questions, null, 2)}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          systemInstruction,
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
        },
      });

      const responseText = response.text;
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

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: `Translate the following health and wellness text into natural, professional ${langName}. Preserve formatting and markdown if present:\n\n${text}`,
      });

      return res.json({ success: true, translatedText: response.text });
    } catch (err: any) {
      console.error("AI Text Translation Error:", err);
      return res.status(500).json({ 
        error: "Text translation failed", 
        message: err.message || "Unknown error" 
      });
    }
  });

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
