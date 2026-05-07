import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  type OnModuleInit,
} from '@nestjs/common';
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { ENV_TOKEN, type Env } from '../../config/env.js';

import type { UploadKind, UploadUrlResponse } from '@petwalker/shared/dto';

const URL_TTL_SECONDS = 5 * 60;

/**
 * Single S3 path for both dev (MinIO via AWS_S3_ENDPOINT) and prod (real AWS).
 * In dev we also auto-create the bucket and set CORS so the browser can PUT directly.
 */
@Injectable()
export class S3Service implements OnModuleInit {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client;
  private readonly buckets: Record<UploadKind, string>;
  private readonly region: string;
  private readonly publicEndpoint: string;
  private readonly forcePathStyle: boolean;

  constructor(@Inject(ENV_TOKEN) private readonly env: Env) {
    this.region = env.AWS_S3_REGION ?? env.AWS_REGION;
    this.forcePathStyle = env.AWS_S3_FORCE_PATH_STYLE || Boolean(env.AWS_S3_ENDPOINT);

    this.buckets = {
      'pet-photo': env.AWS_S3_BUCKET_PETS,
      // future kinds slot in here:
      avatar: env.AWS_S3_BUCKET_PETS, // TEMP: avatars share the pets bucket until we add AWS_S3_BUCKET_AVATARS
    };

    this.client = new S3Client({
      region: this.region,
      endpoint: env.AWS_S3_ENDPOINT,
      forcePathStyle: this.forcePathStyle,
      credentials:
        env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
          ? { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY }
          : undefined,
    });

    // For path-style (MinIO) the public URL is `<endpoint>/<bucket>/<key>`.
    // For virtual-hosted (real AWS) it's `https://<bucket>.s3.<region>.amazonaws.com/<key>`.
    this.publicEndpoint = env.AWS_S3_ENDPOINT
      ? env.AWS_S3_ENDPOINT.replace(/\/$/, '')
      : `https://s3.${this.region}.amazonaws.com`;
  }

  async onModuleInit(): Promise<void> {
    if (this.env.APP_ENV !== 'dev') return;
    // In dev, auto-create the bucket on the local MinIO so onboarding is one command.
    for (const bucket of new Set(Object.values(this.buckets))) {
      await this.ensureBucket(bucket);
    }
  }

  async createPutUrl(params: {
    kind: UploadKind;
    userId: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<UploadUrlResponse> {
    const bucket = this.buckets[params.kind];
    if (!bucket) {
      throw new BadRequestException(`No bucket configured for upload kind ${params.kind}`);
    }

    const ext = mimeToExt(params.mimeType);
    const fileKey = `${params.kind}/${params.userId}/${randomUUID()}.${ext}`;

    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: fileKey,
      ContentType: params.mimeType,
      ContentLength: params.sizeBytes,
    });

    const uploadUrl = await getSignedUrl(this.client, cmd, { expiresIn: URL_TTL_SECONDS });
    const publicUrl = this.forcePathStyle
      ? `${this.publicEndpoint}/${bucket}/${fileKey}`
      : `https://${bucket}.s3.${this.region}.amazonaws.com/${fileKey}`;
    const expiresAt = new Date(Date.now() + URL_TTL_SECONDS * 1000).toISOString();

    return {
      uploadUrl,
      publicUrl,
      fileKey,
      expiresAt,
      requiredHeaders: {
        'Content-Type': params.mimeType,
        'Content-Length': String(params.sizeBytes),
      },
    };
  }

  private async ensureBucket(bucket: string): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: bucket }));
      return; // exists
    } catch {
      // create + CORS
    }
    try {
      await this.client.send(new CreateBucketCommand({ Bucket: bucket }));
      await this.client.send(
        new PutBucketCorsCommand({
          Bucket: bucket,
          CORSConfiguration: {
            CORSRules: [
              {
                AllowedMethods: ['PUT', 'GET'],
                AllowedOrigins: [
                  'http://localhost:3000',
                  'http://localhost:3030',
                  'http://localhost:8081',
                  'http://localhost:19006',
                ],
                AllowedHeaders: ['*'],
                ExposeHeaders: ['ETag'],
                MaxAgeSeconds: 3000,
              },
            ],
          },
        }),
      );
      this.logger.log(`Created MinIO bucket "${bucket}" with dev CORS.`);
    } catch (err) {
      this.logger.warn(`Could not bootstrap bucket "${bucket}": ${(err as Error).message}`);
    }
  }
}

function mimeToExt(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/heic':
      return 'heic';
    default:
      return 'bin';
  }
}
