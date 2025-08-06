import axios from "axios";
import fs from "fs";
import path from "path";
import { logger } from "../utils/logger";

export class ElevenLabsService {
  private apiKey: string;
  private baseUrl = process.env.ELEVENLABS_BASE_URL;
  private voiceId: string;

  constructor(apiKey: string, voiceId = "EXAVITQu4vr4xnSDxMaL") {
    this.apiKey = apiKey;
    this.voiceId = voiceId;
  }

  textToSpeech = async(text: string, voiceId?: string): Promise<Buffer> =>{
    try {
      const voice = voiceId || this.voiceId;

      const cleanText = this.prepareTextForTTS(text);

      const response = await axios.post(
        `${this.baseUrl}/text-to-speech/${voice}`,
        {
          text: cleanText,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
            style: 0.0,
            use_speaker_boost: true,
          },
        },
        {
          headers: {
            Accept: "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": this.apiKey,
          },
          responseType: "arraybuffer",
        }
      );

      return Buffer.from(response.data);
    } catch (error) {
      logger.error("Error generating speech:", error);
      throw new Error("Failed to generate audio");
    }
  }

  private prepareTextForTTS = (text: string): string =>{
    let cleanText = text
      .replace(/\n\n+/g, ". ")
      .replace(/\n/g, " ")
      .replace(/[^\w\s.,!?;:'"()-]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const maxLength = 500;
    if (cleanText.length > maxLength) {
      const truncated = cleanText.substring(0, maxLength);
      const lastSentence = truncated.lastIndexOf(".");

      if (lastSentence > maxLength * 0.7) {
        cleanText = truncated.substring(0, lastSentence + 1);
      } else {
        cleanText = truncated + "...";
      }
    }

    return cleanText;
  }

  getVoices = async(): Promise<any[]> =>{
    try {
      const response = await axios.get(`${this.baseUrl}/voices`, {
        headers: {
          "xi-api-key": this.apiKey,
        },
      });
      return response.data.voices;
    } catch (error) {
      logger.error("Error fetching voices:", error);
      return [];
    }
  }

  saveAudioToFile = async(
    audioBuffer: Buffer,
    filename: string
  ): Promise<string> =>{
    const audioDir = path.join(process.cwd(), "audio");

    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    const filePath = path.join(audioDir, `${filename}.mp3`);
    fs.writeFileSync(filePath, audioBuffer);

    return filePath;
  }
}
