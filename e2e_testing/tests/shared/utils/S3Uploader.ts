import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const S3_BASE_PATH = 'input_files/e2e_snapshots/independent_programs/listing';
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

export class S3Uploader {
  private s3Client: S3Client | null = null;
  private bucketName: string;
  private region: string;
  private isConfigured: boolean = false;

  constructor() {
    this.bucketName = process.env.S3_BUCKET_NAME || '';
    this.region = process.env.AWS_REGION || 'us-east-2';

    if (this.validateS3Config()) {
      this.initializeS3Client();
    }
  }

  /**
   * Validates that required S3 configuration is present
   */
  private validateS3Config(): boolean {
    if (!this.bucketName) {
      console.warn(
        'S3_BUCKET_NAME not configured. S3 operations will be disabled.'
      );
      return false;
    }

    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.warn(
        'AWS credentials not configured. S3 operations will be disabled.'
      );
      return false;
    }

    return true;
  }

  /**
   * Initializes S3 client with credentials from environment variables
   */
  private initializeS3Client(): void {
    try {
      const credentials: any = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };

      // Add session token if provided (for temporary credentials)
      if (process.env.AWS_SESSION_TOKEN) {
        credentials.sessionToken = process.env.AWS_SESSION_TOKEN;
      }

      this.s3Client = new S3Client({
        region: this.region,
        credentials: credentials,
      });

      this.isConfigured = true;
    } catch (error) {
      console.error('Failed to initialize S3 client:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Checks if S3 is properly configured
   */
  isAvailable(): boolean {
    return this.isConfigured && this.s3Client !== null;
  }

  /**
   * Uploads a snapshot to S3
   * @param snapshot - The snapshot object to upload
   * @param dateFolder - Date folder in YYYYMMDD format
   * @param distributorName - Name of the distributor (for logging)
   * @returns S3 key path if successful, null otherwise
   */
  async uploadSnapshot(
    snapshot: any,
    dateFolder: string,
    distributorName: string
  ): Promise<string | null> {
    if (!this.isAvailable()) {
      console.warn('S3 not available. Skipping upload.');
      return null;
    }

    try {
      const s3Key = `${S3_BASE_PATH}/${dateFolder}/${SNAPSHOT_FILENAME}`;
      const jsonContent = JSON.stringify(snapshot, null, 2);

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        Body: jsonContent,
        ContentType: 'application/json',
      });

      await this.s3Client!.send(command);

      console.log(
        `Snapshot uploaded to S3 for ${distributorName} at: s3://${this.bucketName}/${s3Key}`
      );

      return s3Key;
    } catch (error) {
      console.error(
        `Failed to upload snapshot to S3:`,
        error?.message ?? error
      );
      return null;
    }
  }

  /**
   * Uploads a screenshot to S3
   * @param screenshotBuffer - Buffer containing the screenshot image data
   * @param dateFolder - Date folder in YYYYMMDD format
   * @param distributorName - Name of the distributor (for logging)
   * @returns S3 key path if successful, null otherwise
   */
  async uploadScreenshot(
    screenshotBuffer: Buffer,
    dateFolder: string,
    distributorName: string
  ): Promise<string | null> {
    if (!this.isAvailable()) {
      console.warn('S3 not available. Skipping screenshot upload.');
      return null;
    }

    try {
      const s3Key = `${S3_BASE_PATH}/${dateFolder}/full_page.png`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        Body: screenshotBuffer,
        ContentType: 'image/png',
      });

      await this.s3Client!.send(command);

      console.log(
        `Screenshot uploaded to S3 for ${distributorName} at: s3://${this.bucketName}/${s3Key}`
      );

      return s3Key;
    } catch (error) {
      console.error(
        `Failed to upload screenshot to S3:`,
        error?.message ?? error
      );
      return null;
    }
  }

  /**
   * Downloads a snapshot from S3
   * @param dateFolder - Date folder in YYYYMMDD format
   * @returns Snapshot object if successful, null otherwise
   */
  async downloadSnapshot(dateFolder: string): Promise<any | null> {
    if (!this.isAvailable()) {
      console.warn('S3 not available. Cannot download snapshot.');
      return null;
    }

    try {
      const s3Key = `${S3_BASE_PATH}/${dateFolder}/${SNAPSHOT_FILENAME}`;

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      const response = await this.s3Client!.send(command);

      if (!response.Body) {
        console.warn(`Snapshot not found in S3: ${s3Key}`);
        return null;
      }

      // Convert stream to string
      let bodyString = '';
      if (typeof response.Body === 'string') {
        bodyString = response.Body;
      } else if (
        response.Body &&
        typeof (response.Body as any).transformToString === 'function'
      ) {
        bodyString = await (response.Body as any).transformToString();
      } else {
        // Fallback: read stream chunks
        const chunks: Uint8Array[] = [];
        for await (const chunk of response.Body as any) {
          chunks.push(chunk);
        }
        bodyString = Buffer.concat(chunks).toString('utf-8');
      }

      const snapshot = JSON.parse(bodyString);

      console.log(`Snapshot downloaded from S3: ${s3Key}`);

      return snapshot;
    } catch (error: any) {
      if (
        error.name === 'NoSuchKey' ||
        error.$metadata?.httpStatusCode === 404
      ) {
        console.warn(`Snapshot not found in S3 for date: ${dateFolder}`);
      } else {
        console.error(`Failed to download snapshot from S3:`, error);
      }
      return null;
    }
  }

  /**
   * Lists all snapshot date folders in S3
   * @param maxLimit - Maximum number of dates to return (default: 15)
   * @returns Array of date folder names (YYYYMMDD format) sorted by date (most recent first), limited to maxLimit
   */
  async listSnapshotFolders(maxLimit: number = 15): Promise<string[]> {
    if (!this.isAvailable()) {
      console.warn('S3 not available. Cannot list snapshots.');
      return [];
    }

    try {
      const allDateFolders: string[] = [];
      let continuationToken: string | undefined = undefined;
      let hasMore = true;

      // Handle pagination to get all available dates
      while (hasMore && allDateFolders.length < maxLimit * 2) {
        const command = new ListObjectsV2Command({
          Bucket: this.bucketName,
          Prefix: `${S3_BASE_PATH}/`,
          Delimiter: '/',
          MaxKeys: 1000, // Request maximum to get as many as possible per request
          ContinuationToken: continuationToken,
        });

        const response = (await this.s3Client!.send(command)) as any;

        if (response.CommonPrefixes && response.CommonPrefixes.length > 0) {
          // Extract date folders from prefixes
          const dateFolders = response.CommonPrefixes.map((prefix: any) => {
            const path = prefix.Prefix || '';
            // Extract YYYYMMDD from path like "input_files/e2e_snapshots/independent_programs/listing/20251117/"
            const parts = path.split('/');
            const datePart = parts[parts.length - 2]; // Get the date folder part
            return datePart;
          }).filter((folder: string) => parseDateFolder(folder) !== null);

          allDateFolders.push(...dateFolders);
        }

        // Check if there are more results
        hasMore = response.IsTruncated === true;
        continuationToken = response.NextContinuationToken;
      }

      // Sort all dates and limit to maxLimit
      const sortedDates = allDateFolders
        .sort((a, b) => {
          const dateA = parseDateFolder(a);
          const dateB = parseDateFolder(b);
          if (!dateA || !dateB) return 0;
          return dateB.getTime() - dateA.getTime(); // Most recent first
        })
        .slice(0, maxLimit); // Limit to maxLimit

      console.log(
        `\nFound ${allDateFolders.length} total snapshot dates, returning ${sortedDates.length} most recent`
      );

      if (sortedDates.length > 0) {
        // Format dates from YYYYMMDD to YYYY-MM-DD for display
        const formattedDates = sortedDates.map((dateStr) => {
          if (dateStr.length === 8) {
            return `${dateStr.substring(0, 4)}-${dateStr.substring(
              4,
              6
            )}-${dateStr.substring(6, 8)}`;
          }
          return dateStr;
        });
        console.log(`Available snapshot dates: ${formattedDates.join(', ')}\n`);
      } else {
        console.log(`${'No snapshot dates found in S3'}\n`);
      }

      return sortedDates;
    } catch (error) {
      console.error(`Failed to list snapshots from S3:`, error);
      return [];
    }
  }

  /**
   * Gets the most recent snapshot folder (excluding current date)
   * @returns Date folder name (YYYYMMDD format) or null if none found
   */
  async getMostRecentSnapshotFolder(): Promise<string | null> {
    const dateFolders = await this.listSnapshotFolders();
    const currentDateFolder = formatDateFolder(new Date());

    // Filter out current date folder to get previous snapshots only
    const previousFolders = dateFolders.filter(
      (folder) => folder !== currentDateFolder
    );

    if (previousFolders.length === 0) {
      return null;
    }

    return previousFolders[0];
  }

  /**
   * Downloads the most recent previous snapshot
   * @param distributorName - Name of the distributor (for logging)
   * @returns Snapshot object or null if none found
   */
  async getMostRecentSnapshot(distributorName: string): Promise<any | null> {
    const mostRecentFolder = await this.getMostRecentSnapshotFolder();

    if (!mostRecentFolder) {
      return null;
    }

    const snapshot = await this.downloadSnapshot(mostRecentFolder);

    if (snapshot) {
      // Ensure snapshot_date matches the folder date (folder date is source of truth)
      const date = parseDateFolder(mostRecentFolder);
      if (date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const folderDateISO = `${year}-${month}-${day}`;
        snapshot.snapshot_date = folderDateISO;
        snapshot.week_ending = folderDateISO;
      }

      console.log(
        `Found previous snapshot for ${distributorName} from S3: ${mostRecentFolder}`
      );
    }

    return snapshot;
  }

  /**
   * Lists all available snapshot dates from S3 (limited to 15 most recent)
   * @returns Array of date strings (YYYYMMDD format) sorted by date (most recent first)
   */
  async listAvailableSnapshotDates(): Promise<string[]> {
    console.log('Listing available snapshot dates from S3 (max 15)...');
    const dates = await this.listSnapshotFolders(15);
    return dates;
  }
}
