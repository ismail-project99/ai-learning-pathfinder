import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const roadmapSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    nodes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          stage: { 
            type: Type.STRING,
            enum: ["FUNDAMENTALS", "CORE_SKILLS", "APPLIED_PROJECTS", "ADVANCED_CONCEPTS", "CAREER_PREP"]
          },
          estimatedHours: { type: Type.NUMBER },
          resources: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                url: { type: Type.STRING, description: "Direct URL for articles or documentation. Leave empty for youtube type." },
                youtubeSearchQuery: { type: Type.STRING, description: "Specific search query for YouTube videos (e.g. 'NetworkChuck OSPF tutorial'). Leave empty for non-youtube types." },
                type: { 
                  type: Type.STRING,
                  enum: ["youtube", "article", "documentation"]
                },
                completed: { type: Type.BOOLEAN }
              },
              required: ["title", "type", "completed"]
            }
          },
          dependencies: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["id", "title", "stage", "dependencies"]
      }
    }
  },
  required: ["title", "nodes"]
};

export async function generateRoadmap(skill: string, goal: string, proficiency: string) {
  const prompt = `Act as a world-class curriculum designer. Create a comprehensive, high-quality learning roadmap for someone wanting to learn ${skill} to achieve the goal of "${goal}". The user's current proficiency is ${proficiency}. 
  
  Ensure the roadmap follows a logical progression (DAG). 
  Include specific, real-world projects in the APPLIED_PROJECTS stage.
  
  RESOURCE GUIDELINES:
  - Provide 2-3 high-quality resource links per node.
  - HEAVILY EMPHASIZE specific YouTube video tutorials and crash courses. 
  - For each resource, specify if it is a "youtube" video, an "article", or "documentation".
  - CRITICAL: DO NOT generate direct URLs for YouTube videos. Instead, provide a highly specific "youtubeSearchQuery" that will lead the user to the best content (e.g., "NetworkChuck OSPF tutorial" or "Professor Messer CompTIA A+").
  - For "article" and "documentation" types, provide a valid "url".
  - Set "completed" to false for all resources by default.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: roadmapSchema,
    },
  });

  return JSON.parse(response.text);
}

export async function getMentorResponse(question: string, context: any) {
  const prompt = `You are an expert AI Mentor. 
  User is learning: ${context.roadmapTitle}
  Current Node: ${context.currentNodeTitle}
  Roadmap Context: ${context.roadmapDescription}
  
  Question: ${question}
  
  Provide a concise, helpful answer. If code is needed, use Markdown blocks. Relate the answer to their current learning milestone.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text;
}
