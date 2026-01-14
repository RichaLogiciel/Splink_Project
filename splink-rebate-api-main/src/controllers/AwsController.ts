import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import axios from "axios";
import { Request, Response } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";

import {
  sendErrorResponse,
  sendSuccessResponse
} from "../utils/responseHandler";

const dotenv = require("dotenv");
dotenv.config();

const MAX_FILE_SIZE = 2; // MB

class AwsController {
  private s3: S3Client;

  constructor() {
    const s3ClientDefaultConfigs = {
      region: process.env.AWS_REGION || ""
    };

    const s3ClientCustomConfigs = {
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        sessionToken: process.env.AWS_SESSION_TOKEN!
      }
    };

    const s3ClientConfigs = process.env.AWS_ACCESS_KEY_ID
      ? { ...s3ClientDefaultConfigs, ...s3ClientCustomConfigs }
      : { ...s3ClientDefaultConfigs };

    this.s3 = new S3Client(s3ClientConfigs);
  }

  /**
   * Creates and returns a multer middleware for handling file uploads.
   *
   * The middleware uses memory storage and restricts the maximum file size
   * to the value specified by MAX_FILE_SIZE in megabytes.
   *
   * @returns A multer instance configured with memory storage and file size limits.
   */
  public getUploadMiddleware(): multer.Multer {
    return multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE * 1024 * 1024 }
    });
  }

  /**
   * Generates a signed URL for an S3 object using the specified command.
   *
   * This method utilizes the AWS SDK to create a pre-signed URL for accessing
   * an S3 object. The URL is valid for the duration specified by the expiresIn
   * parameter.
   *
   * @param command - The command object for the S3 operation.
   * @param expiresIn - The duration in seconds for which the signed URL is valid.
   * @returns A promise that resolves to the signed URL as a string.
   */
  public async getSignedUrlForS3Object(
    command: any,
    expiresIn: number
  ): Promise<string> {
    // Generate a signed URL for the S3 object
    const signedUrl = await getSignedUrl(this.s3, command, { expiresIn });

    return signedUrl;
  }

  /**
   * Checks if an object exists in an S3 bucket.
   *
   * This method uses HeadObjectCommand to check if an object exists without
   * downloading it. This is a lightweight operation that only fetches metadata.
   *
   * @param bucketName - The name of the S3 bucket containing the object.
   * @param objectKey - The key of the object to check in the S3 bucket.
   * @returns A promise that resolves to true if the object exists, false if it doesn't exist.
   * @throws Throws AWS errors for permissions, network issues, or other non-NotFound errors.
   */
  public async checkS3ObjectExists(
    bucketName: string,
    objectKey: string
  ): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: bucketName,
        Key: objectKey
      });

      await this.s3.send(command);
      return true;
    } catch (error: any) {
      // Check if the error is a "NotFound" error (object doesn't exist)
      if (
        error.name === "NotFound" ||
        error.$metadata?.httpStatusCode === 404 ||
        error.Code === "NoSuchKey" ||
        error.Code === "NotFound"
      ) {
        return false;
      }
      // Re-throw other errors (permissions, network, etc.) to be handled by caller
      throw error;
    }
  }

  /**
   * Generates a pre-signed URL for reading an object from an S3 bucket.
   *
   * This method creates a command to retrieve an object from the specified
   * S3 bucket and generates a pre-signed URL that is valid for 1 hour.
   *
   * @param bucketName - The name of the S3 bucket containing the object.
   * @param objectKey - The key of the object to be accessed in the S3 bucket.
   * @returns A promise that resolves to a pre-signed URL for reading the S3 object.
   */
  public async getReadSignedUrlForS3Object(
    bucketName: string,
    objectKey: string
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey
    });

    // Generate a signed URL for the S3 object - expiresIn is in seconds (7 Days)
    // To Do - Need to validate the expire time
    const signedUrl = await this.getSignedUrlForS3Object(
      command,
      60 * 60 * 24 * 7 - 1 // (7 Days -1 second)
    );

    return signedUrl;
  }

  /**
   * Generates a pre-signed URL for uploading an object to an S3 bucket.
   *
   * This method creates a command to put an object into the specified
   * S3 bucket and generates a pre-signed URL that is valid for 5 minutes.
   *
   * @param bucketName - The name of the S3 bucket where the object will be uploaded.
   * @param objectKey - The key for the object to be uploaded in the S3 bucket.
   * @returns A promise that resolves to a pre-signed URL for uploading the S3 object.
   */
  public async getWriteSignedUrlForS3Object(
    bucketName: string,
    objectKey: string
  ): Promise<string> {
    const signedUrlParams: PutObjectCommandInput = {
      Bucket: bucketName,
      Key: objectKey
    };

    const command = new PutObjectCommand(signedUrlParams);

    // Generate pre-signed URL - expiresIn is in seconds (2 min)
    const signedUrl = await this.getSignedUrlForS3Object(command, 60 * 2);

    return signedUrl;
  }

  /**
   * Uploads a file to AWS S3 using a pre-signed URL.
   *
   * This method generates a pre-signed URL for uploading a file to a specified
   * S3 bucket. It utilizes AWS SDK for S3 and handles the request through
   * Express.js. The method ensures secure file upload by leveraging UUIDs
   * for unique file identification.
   *
   * @param req - The Express request object containing file data.
   * @param res - The Express response object for sending responses.
   * @returns A promise that resolves with a success response or an error response.
   */
  public async uploadFileViaSignedUrl(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { file } = req;

      if (!file) return sendErrorResponse(res, "File is required.", 422);

      const fileName = `${uuidv4()}-${file.originalname}`;

      const bucketName = process.env.AWS_FILE_BUCKET || "";

      // Generate pre-signed URL to upload file
      const writeSignedUrl = await this.getWriteSignedUrlForS3Object(
        bucketName,
        fileName
      );

      // Upload file
      await axios.put(writeSignedUrl, file.buffer, {
        headers: {
          "Content-Type": file.mimetype
        }
      });

      // Generate pre-signed URL to read file
      const readSignedUrl = await this.getReadSignedUrlForS3Object(
        bucketName,
        fileName
      );

      return sendSuccessResponse(res, { fileUrl: readSignedUrl });
    } catch (error: any) {
      return sendErrorResponse(
        res,
        error?.response?.data ||
          error?.message ||
          "An internal error occurred while uploading file.",
        422
      );
    }
  }

  /**
   * Uploads a file directly to AWS S3.
   *
   * This method handles file uploads to a specified S3 bucket using the AWS SDK.
   * It generates a unique file name using UUIDs and uploads the file content
   * directly from the request. The method returns a success response with the
   * upload result or an error response if the upload fails.
   *
   * @param req - The Express request object containing the file to be uploaded.
   * @param res - The Express response object for sending the response.
   * @returns A promise that resolves with a success or error response.
   */
  public async uploadFileS3(req: Request, res: Response): Promise<Response> {
    try {
      const { file } = req;

      if (!file) return sendErrorResponse(res, "File is required.", 422);

      const fileName = `${uuidv4()}-${file.originalname}`;

      const bucketName = process.env.AWS_FILE_BUCKET;

      const params = {
        Bucket: bucketName,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype
      };

      const command = new PutObjectCommand(params);

      // Upload file on S3
      await this.s3.send(command);

      // Construct the public URL of the uploaded file
      const fileUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

      return sendSuccessResponse(res, { fileUrl });
    } catch (error: any) {
      return sendErrorResponse(
        res,
        error?.response?.data ||
          error?.message ||
          "An internal error occurred while uploading file.",
        422
      );
    }
  }
}

export default new AwsController();
