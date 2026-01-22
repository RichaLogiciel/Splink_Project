import fs from 'fs';
import path from 'path';
import { S3Uploader } from './S3Uploader';

const SNAPSHOT_BASE_DIR = '__data_snapshots__';
const SNAPSHOT_FILENAME = 'metadata.json';

/**
 * Formats a date as YYYYMMDD (e.g., 20251117 for November 17, 2025)
 */
function formatDateFolder(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Parses a date folder name (YYYYMMDD) back to a Date object
 */
function parseDateFolder(folderName: string): Date | null {
  if (folderName.length !== 8) {
    return null;
  }
  const year = parseInt(folderName.substring(0, 4));
  const month = parseInt(folderName.substring(4, 6)) - 1; // Month is 0-indexed
  const day = parseInt(folderName.substring(6, 8));

  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    return null;
  }

  const date = new Date(year, month, day);
  // Validate the date
  if (
    date.getDate() !== day ||
    date.getMonth() !== month ||
    date.getFullYear() !== year
  ) {
    return null;
  }

  return date;
}

/**
 * Converts a date folder name (YYYYMMDD) to YYYY-MM-DD format
 */
function folderDateToISOString(folderName: string): string | null {
  const date = parseDateFolder(folderName);
  if (!date) {
    return null;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Gets all snapshot date folders sorted by date (most recent first)
 */
function getAllSnapshotDates(): string[] {
  const baseDir = path.resolve(process.cwd(), SNAPSHOT_BASE_DIR);

  if (!fs.existsSync(baseDir)) {
    return [];
  }

  const folders = fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)
    .filter((name) => parseDateFolder(name) !== null)
    .sort((a, b) => {
      const dateA = parseDateFolder(a);
      const dateB = parseDateFolder(b);
      if (!dateA || !dateB) return 0;
      return dateB.getTime() - dateA.getTime(); // Most recent first
    });

  return folders;
}

export class SnapshotManager {
  private s3Uploader: S3Uploader | null = null;
  private storageMode: 'local' | 's3' | 'both' = 'local';

  constructor() {
    // Determine storage mode from environment variable
    const mode = process.env.SNAPSHOT_STORAGE_MODE?.toLowerCase();
    if (mode === 's3' || mode === 'both') {
      this.s3Uploader = new S3Uploader();
      if (this.s3Uploader.isAvailable()) {
        this.storageMode = mode as 's3' | 'both';
      } else {
        console.warn('S3 not available. Falling back to local storage mode.');
        this.storageMode = 'local';
      }
    }
  }

  /**
   * Gets the current storage mode
   */
  private getStorageMode(): 'local' | 's3' | 'both' {
    return this.storageMode;
  }

  /**
   * Saves a snapshot to a date-based folder (local and/or S3 based on storage mode)
   * @param snapshot - The snapshot object to save
   * @param distributorName - Name of the distributor (for logging)
   * @returns The path where the snapshot was saved (local path or S3 key)
   */
  async saveSnapshot(snapshot: any, distributorName: string): Promise<string> {
    const date = new Date();
    const dateFolder = formatDateFolder(date);

    // Ensure snapshot_date matches the folder date
    const folderDateISO = folderDateToISOString(dateFolder);
    if (folderDateISO) {
      snapshot.snapshot_date = folderDateISO;
      snapshot.week_ending = folderDateISO;
    }

    const mode = this.getStorageMode();
    let savedPath = '';

    // Save to S3 if mode is 's3' or 'both'
    if ((mode === 's3' || mode === 'both') && this.s3Uploader?.isAvailable()) {
      try {
        const s3Key = await this.s3Uploader.uploadSnapshot(
          snapshot,
          dateFolder,
          distributorName
        );
        if (s3Key) {
          savedPath = `s3://${process.env.S3_BUCKET_NAME}/${s3Key}`;
        } else if (mode === 's3') {
          // If S3-only mode and upload failed, throw error
          throw new Error('Failed to upload snapshot to S3');
        }
      } catch (error) {
        console.error('S3 upload failed:', error?.message ?? error);
        if (mode === 's3') {
          throw error;
        }
        // If 'both' mode, continue with local save
      }
    }

    // Save to local if mode is 'local' or 'both'
    if (mode === 'local' || mode === 'both') {
      const baseDir = path.resolve(process.cwd(), SNAPSHOT_BASE_DIR);
      const dateDir = path.join(baseDir, dateFolder);

      // Create directories if they don't exist
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }
      if (!fs.existsSync(dateDir)) {
        fs.mkdirSync(dateDir, { recursive: true });
      }

      const filePath = path.join(dateDir, SNAPSHOT_FILENAME);

      // Write snapshot to file
      fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');

      console.log(
        `Snapshot saved locally for ${distributorName} at: ${filePath}`
      );
      savedPath = filePath;
    }

    return savedPath;
  }

  /**
   * Saves a screenshot to a date-based folder (local and/or S3 based on storage mode)
   * @param screenshotBuffer - Buffer containing the screenshot image data
   * @param distributorName - Name of the distributor (for logging)
   * @returns The path where the screenshot was saved (local path or S3 key)
   */
  async saveScreenshot(
    screenshotBuffer: Buffer,
    distributorName: string
  ): Promise<string> {
    const date = new Date();
    const dateFolder = formatDateFolder(date);

    const mode = this.getStorageMode();
    let savedPath = '';

    // Save to S3 if mode is 's3' or 'both'
    if ((mode === 's3' || mode === 'both') && this.s3Uploader?.isAvailable()) {
      try {
        const s3Key = await this.s3Uploader.uploadScreenshot(
          screenshotBuffer,
          dateFolder,
          distributorName
        );
        if (s3Key) {
          savedPath = `s3://${process.env.S3_BUCKET_NAME}/${s3Key}`;
        } else if (mode === 's3') {
          // If S3-only mode and upload failed, log warning but don't throw
          console.warn('Failed to upload screenshot to S3, but continuing...');
        }
      } catch (error) {
        console.error('S3 screenshot upload failed:', error?.message ?? error);
        if (mode === 's3') {
          // Log warning but don't fail the test
          console.warn('Screenshot upload to S3 failed, but continuing...');
        }
        // If 'both' mode, continue with local save
      }
    }

    // Save to local if mode is 'local' or 'both'
    if (mode === 'local' || mode === 'both') {
      const baseDir = path.resolve(process.cwd(), SNAPSHOT_BASE_DIR);
      const dateDir = path.join(baseDir, dateFolder);

      // Create directories if they don't exist
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }
      if (!fs.existsSync(dateDir)) {
        fs.mkdirSync(dateDir, { recursive: true });
      }

      const filePath = path.join(dateDir, 'full_page.png');

      // Write screenshot to file
      fs.writeFileSync(filePath, screenshotBuffer);

      console.log(
        `Screenshot saved locally for ${distributorName} at: ${filePath}`
      );
      savedPath = filePath;
    }

    return savedPath;
  }

  /**
   * Finds the most recent previous snapshot (excluding current date)
   * Fetches from S3 if mode is 's3' or 'both', otherwise from local
   * @param distributorName - Name of the distributor (for logging)
   * @returns The most recent snapshot object, or null if none exists
   */
  async findMostRecentSnapshot(distributorName: string): Promise<any | null> {
    const mode = this.getStorageMode();

    // Try S3 first if mode is 's3' or 'both'
    if ((mode === 's3' || mode === 'both') && this.s3Uploader?.isAvailable()) {
      try {
        const s3Snapshot = await this.s3Uploader.getMostRecentSnapshot(
          distributorName
        );
        if (s3Snapshot) {
          return s3Snapshot;
        }
        // If S3 mode and no snapshot found, return null
        if (mode === 's3') {
          return null;
        }
        // If 'both' mode and S3 failed, fallback to local
        console.log('No snapshot found in S3, trying local storage...');
      } catch (error) {
        console.error('Failed to fetch snapshot from S3:', error);
        if (mode === 's3') {
          return null;
        }
        // If 'both' mode, fallback to local
        console.log('Falling back to local storage...');
      }
    }

    // Try local storage if mode is 'local' or 'both' (fallback)
    if (mode === 'local' || mode === 'both') {
      const dateFolders = getAllSnapshotDates();
      const currentDateFolder = formatDateFolder(new Date());

      // Filter out current date folder to get previous snapshots only
      const previousFolders = dateFolders.filter(
        (folder) => folder !== currentDateFolder
      );

      if (previousFolders.length === 0) {
        return null;
      }

      // Get the most recent previous snapshot
      const mostRecentFolder = previousFolders[0];
      const filePath = path.join(
        process.cwd(),
        SNAPSHOT_BASE_DIR,
        mostRecentFolder,
        SNAPSHOT_FILENAME
      );

      if (!fs.existsSync(filePath)) {
        console.warn(`Snapshot file not found at expected path: ${filePath}`);
        return null;
      }

      try {
        const snapshotData = fs.readFileSync(filePath, 'utf-8');
        const snapshot = JSON.parse(snapshotData);

        // Ensure snapshot_date matches the folder date (folder date is source of truth)
        const folderDateISO = folderDateToISOString(mostRecentFolder);
        if (folderDateISO) {
          snapshot.snapshot_date = folderDateISO;
          snapshot.week_ending = folderDateISO;
        }

        console.log(
          `Found previous snapshot for ${distributorName} from local: ${mostRecentFolder} (date: ${folderDateISO})`
        );

        return snapshot;
      } catch (error) {
        console.error(`Error reading snapshot file: ${filePath}`, error);
        return null;
      }
    }

    return null;
  }

  /**
   * Lists all available snapshot dates (from S3 if S3 mode, otherwise from local)
   * Limited to 15 most recent dates
   * @returns Array of date folder names (YYYYMMDD format) sorted by date (most recent first)
   */
  async listAvailableSnapshotDates(): Promise<string[]> {
    const mode = this.getStorageMode();

    // Try S3 first if mode is 's3' or 'both'
    if ((mode === 's3' || mode === 'both') && this.s3Uploader?.isAvailable()) {
      try {
        return await this.s3Uploader.listAvailableSnapshotDates();
      } catch (error) {
        console.error('Failed to list snapshots from S3:', error);
        if (mode === 's3') {
          return [];
        }
        // If 'both' mode, fallback to local
      }
    }

    // Try local storage if mode is 'local' or 'both'
    if (mode === 'local' || mode === 'both') {
      const dateFolders = getAllSnapshotDates();
      return dateFolders.slice(0, 15); // Limit to 15 most recent
    }

    return [];
  }
}
