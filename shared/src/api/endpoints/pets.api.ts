import type { CreatePetDto, ListPetsQuery, UpdatePetDto } from '../../dto/pet.dto.js';
import type { RequestUploadUrlDto, UploadUrlResponse } from '../../dto/upload.dto.js';
import type { CursorPage, UUID } from '../../types/common.js';
import type { Pet } from '../../types/pet.js';
import type { HttpClient } from '../http.js';

export class PetsApi {
  constructor(private readonly http: HttpClient) {}

  list(query: Partial<ListPetsQuery> = {}): Promise<CursorPage<Pet>> {
    return this.http.get('/pets', query);
  }

  get(id: UUID): Promise<Pet> {
    return this.http.get(`/pets/${id}`);
  }

  create(body: CreatePetDto): Promise<Pet> {
    return this.http.post('/pets', body);
  }

  update(id: UUID, body: UpdatePetDto): Promise<Pet> {
    return this.http.patch(`/pets/${id}`, body);
  }

  delete(id: UUID): Promise<void> {
    return this.http.delete(`/pets/${id}`);
  }

  /**
   * Pre-signed S3 PUT URL for a pet photo. Three-step upload flow:
   *   1. const { uploadUrl, publicUrl, requiredHeaders } =
   *        await api.pets.requestPhotoUploadUrl({ kind: 'pet-photo', mimeType, sizeBytes });
   *   2. await fetch(uploadUrl, { method: 'PUT', body: file, headers: requiredHeaders });
   *   3. await api.pets.create({ ..., photoUrl: publicUrl });
   */
  requestPhotoUploadUrl(body: RequestUploadUrlDto): Promise<UploadUrlResponse> {
    return this.http.post('/pets/photo-upload-url', body);
  }
}
