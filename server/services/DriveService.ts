import { google } from 'googleapis';
import stream from 'stream';

/**
 * ASTRA ZENITH: DRIVE INTEGRATION SERVICE (2026 Standards)
 * Handles persistent storage on Google Drive for mission records and analysis.
 */
class DriveService {
    private drive;

    constructor() {
        // Automatically uses Service Account credentials in Cloud Run
        const auth = new google.auth.GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/drive.file']
        });
        this.drive = google.drive({ version: 'v3', auth });
    }

    /**
     * Uploads content to a specific Google Drive folder
     */
    async uploadFile(fileName: string, content: string, folderId: string) {
        try {
            const bufferStream = new stream.PassThrough();
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
        } catch (error) {
            console.error('❌ Google Drive Sync Failed:', error);
            throw error;
        }
    }
}

export const driveService = new DriveService();
