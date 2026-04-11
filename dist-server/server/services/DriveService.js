"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.driveService = void 0;
const googleapis_1 = require("googleapis");
const stream_1 = __importDefault(require("stream"));
/**
 * ASTRA ZENITH: DRIVE INTEGRATION SERVICE (2026 Standards)
 * Handles persistent storage on Google Drive for mission records and analysis.
 */
class DriveService {
    drive;
    constructor() {
        // Automatically uses Service Account credentials in Cloud Run
        const auth = new googleapis_1.google.auth.GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/drive.file']
        });
        this.drive = googleapis_1.google.drive({ version: 'v3', auth });
    }
    /**
     * Uploads content to a specific Google Drive folder
     */
    async uploadFile(fileName, content, folderId) {
        try {
            const bufferStream = new stream_1.default.PassThrough();
            bufferStream.end(Buffer.from(content));
            const response = await this.drive.files.create({
                requestBody: {
                    name: fileName,
                    parents: [folderId]
                },
                media: {
                    mimeType: 'text/plain',
                    body: bufferStream
                }
            });
            console.log(`✅ File synchronized to Google Drive: ${response.data.name} (ID: ${response.data.id})`);
            return response.data.id;
        }
        catch (error) {
            console.error('❌ Google Drive Sync Failed:', error);
            throw error;
        }
    }
}
exports.driveService = new DriveService();
