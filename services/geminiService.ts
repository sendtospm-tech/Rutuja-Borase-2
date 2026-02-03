
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedData } from "../types";

export const extractDataFromDocument = async (
  base64Data: string,
  instructions: string,
  targetColumns: string[]
): Promise<ExtractedData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Extract MIME type and raw base64 data from Data URL
  const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid file data format");
  
  const mimeType = match[1];
  const rawData = match[2];

  const properties: Record<string, any> = {};
  targetColumns.forEach(col => {
    properties[col] = {
      type: Type.STRING,
      description: `Extracted value for ${col}`
    };
  });

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: rawData
          }
        },
        {
          text: `Extract information from this ${mimeType.includes('pdf') ? 'PDF document' : 'image'} based on these instructions: "${instructions}". 
                 Match the extracted data to the following keys: ${targetColumns.join(', ')}. 
                 If a value is not found, return an empty string. Output valid JSON.`
        }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: properties,
        required: targetColumns
      }
    }
  });

  try {
    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    throw new Error("Failed to interpret document data correctly.");
  }
};
