import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const generateAIResponse = async (prompt: string, systemInstruction?: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || "You are a helpful community assistant for ColonyConnect, a smart community management platform.",
      },
    });
    return response.text;
  } catch (error) {
    console.error("AI Error:", error);
    return "Sorry, I'm having trouble processing that right now.";
  }
};

export const summarizeFeed = async (posts: any[]) => {
  if (posts.length === 0) return "No recent activity to summarize.";
  const postTexts = posts.map(p => `${p.userName}: ${p.content}`).join("\n");
  const prompt = `Summarize the following community posts in 2-3 concise sentences:\n${postTexts}`;
  return generateAIResponse(prompt, "You are a concise community news reporter.");
};

export const suggestPost = async (topic: string) => {
  const prompt = `Write a friendly community post about: ${topic}. Keep it under 50 words.`;
  return generateAIResponse(prompt, "You are a helpful and friendly neighbor.");
};
