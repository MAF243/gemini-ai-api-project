import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3000;
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error('❌ GEMINI_API_KEY belum di-set di file .env');
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });
const MODEL = 'gemini-2.5-flash';

// pastikan folder uploads ada
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({ dest: UPLOAD_DIR });

function safeUnlink(filePath) {
    try {
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (_) { }
}

function toInlineData(file) {
    // multer menyediakan file.mimetype dan file.path
    const data = fs.readFileSync(file.path).toString('base64');
    const mimeType = file.mimetype || 'application/octet-stream';
    return { inlineData: { data, mimeType } };
}

/**
 * POST /generate-text
 * Body JSON: { "prompt": "..." }
 * Response: { "output": "..." }
 */
app.post('/generate-text', async (req, res) => {
    try {
        const prompt = req.body?.prompt;
        if (!prompt) return res.status(400).json({ error: 'prompt wajib diisi' });

        const response = await ai.models.generateContent({
            model: MODEL,
            contents: prompt,
        });

        return res.json({ output: response.text });
    } catch (err) {
        return res.status(500).json({ error: err?.message || String(err) });
    }
});

/**
 * POST /generate-from-image
 * form-data:
 * - image: file (png/jpg)
 * - prompt: text (opsional)
 */
app.post('/generate-from-image', upload.single('image'), async (req, res) => {
    const filePath = req.file?.path;
    try {
        if (!req.file) return res.status(400).json({ error: 'file image wajib diupload (field: image)' });

        const prompt = req.body?.prompt || 'Describe this image briefly.';
        const imagePart = toInlineData(req.file);

        const response = await ai.models.generateContent({
            model: MODEL,
            contents: [{ text: prompt }, imagePart],
        });

        return res.json({ output: response.text });
    } catch (err) {
        return res.status(500).json({ error: err?.message || String(err) });
    } finally {
        safeUnlink(filePath);
    }
});

/**
 * POST /generate-from-document
 * form-data:
 * - document: file (pdf/docx/txt, dst)
 * - prompt: text (opsional)
 */
app.post('/generate-from-document', upload.single('document'), async (req, res) => {
    const filePath = req.file?.path;
    try {
        if (!req.file) return res.status(400).json({ error: 'file document wajib diupload (field: document)' });

        const prompt = req.body?.prompt || 'Summarize this document into 7 bullet points.';
        const docPart = toInlineData(req.file);

        const response = await ai.models.generateContent({
            model: MODEL,
            contents: [{ text: prompt }, docPart],
        });

        return res.json({ output: response.text });
    } catch (err) {
        return res.status(500).json({ error: err?.message || String(err) });
    } finally {
        safeUnlink(filePath);
    }
});

/**
 * POST /generate-from-audio
 * form-data:
 * - audio: file (mp3/wav/m4a)
 * - prompt: text (opsional)
 */
app.post('/generate-from-audio', upload.single('audio'), async (req, res) => {
    const filePath = req.file?.path;
    try {
        if (!req.file) return res.status(400).json({ error: 'file audio wajib diupload (field: audio)' });

        const prompt = req.body?.prompt || 'Transcribe and summarize the audio.';
        const audioPart = toInlineData(req.file);

        const response = await ai.models.generateContent({
            model: MODEL,
            contents: [{ text: prompt }, audioPart],
        });

        return res.json({ output: response.text });
    } catch (err) {
        return res.status(500).json({ error: err?.message || String(err) });
    } finally {
        safeUnlink(filePath);
    }
});

// optional: cek server hidup
app.get('/', (req, res) => res.send('OK'));

app.listen(PORT, () => {
    // ini format log yang biasanya ada di contoh
    console.log(`Gemini API server is running at http://localhost:${PORT}`);
});
