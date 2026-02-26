import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateBookSummary(title: string, author: string) {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash-exp",
    contents: `请为书籍《${title}》（作者：${author}）写一段简短、优雅且引人入胜的简介（约150字）。同时提供3个核心关键词。请以 JSON 格式返回，包含 summary 和 keywords 字段。`,
    config: {
      responseMimeType: "application/json",
    },
  });
  return JSON.parse(response.text);
}

export async function getBookRecommendations(recentBooks: string[]) {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash-exp",
    contents: `根据我最近读的书：${recentBooks.join(", ")}，推荐3本类似风格的书籍。每本书包含标题、作者和推荐理由。请以 JSON 格式返回一个数组。`,
    config: {
      responseMimeType: "application/json",
    },
  });
  return JSON.parse(response.text);
}
