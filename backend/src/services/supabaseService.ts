import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseClient: ReturnType<typeof createClient> | null = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    logger.info('Supabase client initialized successfully for storage operations.');
  } catch (error) {
    logger.error('Failed to initialize Supabase client:', error);
  }
} else {
  logger.warn('Supabase credentials (SUPABASE_URL, SUPABASE_KEY) are not set. Running in MOCK storage mode.');
}

export class SupabaseService {
  /**
   * Generates a signed upload URL for a specific path in the private bucket.
   * Gives the client a 5-minute window to PUT the file directly to Supabase.
   */
  static async getSignedUploadUrl(
    filePath: string
  ): Promise<{ signedUrl: string; filePath: string }> {
    if (!supabaseClient) {
      // Mock mode
      logger.info(`[Storage Mock] Generated signed upload URL for path: ${filePath}`);
      const mockSignedUrl = `http://localhost:3000/api/v1/yojana/mock-upload?path=${encodeURIComponent(filePath)}`;
      return {
        signedUrl: mockSignedUrl,
        filePath,
      };
    }

    const bucketName = 'app-docs';
    const { data, error } = await supabaseClient.storage
      .from(bucketName)
      .createSignedUploadUrl(filePath, {
        upsert: true,
      });

    if (error) {
      logger.error('Supabase createSignedUploadUrl failed:', error);
      throw new Error(`Failed to generate signed upload URL: ${error.message}`);
    }

    return {
      signedUrl: data.signedUrl,
      filePath,
    };
  }

  /**
   * Generates a short-lived (60 seconds) signed read URL for a document.
   */
  static async getSignedDownloadUrl(filePath: string): Promise<string> {
    if (!supabaseClient) {
      // Mock mode
      logger.info(`[Storage Mock] Generated signed download URL for path: ${filePath}`);
      
      // If it's a mock upload path, we can serve it back or return a mock PDF/photo placeholder
      if (filePath.toLowerCase().includes('pdf')) {
        return 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
      }
      return 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=80';
    }

    const bucketName = 'app-docs';
    const { data, error } = await supabaseClient.storage
      .from(bucketName)
      .createSignedUrl(filePath, 60);

    if (error) {
      logger.error('Supabase createSignedUrl failed:', error);
      throw new Error(`Failed to generate signed download URL: ${error.message}`);
    }

    return data.signedUrl;
  }

  /**
   * Deletes a file from Supabase storage.
   */
  static async deleteFile(filePath: string): Promise<void> {
    if (!supabaseClient) {
      logger.info(`[Storage Mock] Deleted file from path: ${filePath}`);
      return;
    }

    const bucketName = 'app-docs';
    const { error } = await supabaseClient.storage.from(bucketName).remove([filePath]);

    if (error) {
      logger.error(`Failed to delete file from path: ${filePath}`, error);
      // We log but do not throw to prevent transaction rollback if file deletion fails
    } else {
      logger.info(`Successfully deleted file from Supabase storage: ${filePath}`);
    }
  }
}
