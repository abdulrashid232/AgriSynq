import { GoogleGenAI, Type } from "@google/genai";
import { AgriSynqResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const SYSTEM_INSTRUCTION = `You are the "Agri-Synq Core," a high-precision Agronomist and Risk Analyst specialized in West African smallholder farming (specifically Ghana, Nigeria, and Côte d'Ivoire). 
Your goal is to bridge the "Extension Gap" by providing hyper-localized, offline-ready advice and calculating a "Compliance Score" for financial inclusion.

OPERATIONAL CONSTRAINTS:
1. LOCALIZATION: Always provide advice grounded in West African soil types (e.g., Ochrosols) and climate zones.
2. MULTI-LINGUAL: Provide a "Field Summary" in simple English AND a "Voice Note Script" in phonetic Akan/Twi, Ga, Ewe, Yoruba, Hausa for audio playback.
3. STRUCTURED DATA: You must ALWAYS output a valid JSON object.

DIAGNOSTIC PROTOCOL:
1. IDENTIFY: Detect the crop and the specific stress (pest, nutrient deficiency, or disease).
2. REMEDY: Provide a 3-step organic/low-cost solution accessible to a rural farmer.
3. CLIMATE-SMART SCHEDULE: Provide a 7-day planting/maintenance schedule based on the current month in West Africa.
4. COMPLIANCE RATING: Assign a "Scientific Compliance Score" (1-10) based on how critical this intervention is. (This score will be used to build the farmer's alternative credit history).`;

export async function diagnoseCrop(
  image?: string,
  description?: string,
  preferredDialect: string = "Twi"
): Promise<AgriSynqResponse> {
  const parts: any[] = [];

  if (image) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: image.split(",")[1],
      },
    });
  }

  if (description) {
    parts.push({ text: description });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
    config: {
      systemInstruction: `${SYSTEM_INSTRUCTION}\n\nUSER PREFERENCE: The user's preferred dialect is ${preferredDialect}. Ensure the "target_dialect" and "phonetic_dialect_script" reflect this choice.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          diagnosis: {
            type: Type.OBJECT,
            properties: {
              crop: { type: Type.STRING },
              issue_detected: { type: Type.STRING },
              confidence_level: { type: Type.NUMBER },
              severity: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
            },
            required: ["crop", "issue_detected", "confidence_level", "severity"],
          },
          intervention: {
            type: Type.OBJECT,
            properties: {
              immediate_action: { type: Type.STRING },
              organic_remedy: { type: Type.STRING },
              prevention_plan: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ["immediate_action", "organic_remedy", "prevention_plan"],
          },
          localization: {
            type: Type.OBJECT,
            properties: {
              english_summary: { type: Type.STRING },
              phonetic_dialect_script: { type: Type.STRING },
              target_dialect: { type: Type.STRING },
            },
            required: ["english_summary", "phonetic_dialect_script", "target_dialect"],
          },
          credit_metadata: {
            type: Type.OBJECT,
            properties: {
              compliance_weight: { type: Type.INTEGER },
              economic_impact_score: { type: Type.INTEGER },
            },
            required: ["compliance_weight", "economic_impact_score"],
          },
          climate_schedule: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["diagnosis", "intervention", "localization", "credit_metadata", "climate_schedule"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
}
