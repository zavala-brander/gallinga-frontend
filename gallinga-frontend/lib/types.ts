export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
}

export interface OldFirestoreTimestamp {
  _seconds: number;
  _nanoseconds: number;
}

export type TimestampValue = number | string | Date | FirestoreTimestamp | OldFirestoreTimestamp;

export interface StoryChapter {
  id: string;
  imageUrl: string;
  prompt: string;
  creatorName: string;
  creatorInstagram?: string;
  averageRating?: number;
  ratingCount?: number;
  createdAt: TimestampValue;
}

export interface PendingApprovalImage {
  leonardoGenerationId: string;
  imageUrlFromLeonardo: string;
  prompt: string;
  creatorName: string;
  creatorInstagram?: string;
}