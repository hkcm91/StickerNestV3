/**
 * Prisma type definitions for development
 * These types mirror what Prisma generates, allowing TypeScript compilation
 * before `prisma generate` can be run against a real database.
 *
 * Once Prisma generate works, these can be removed and replaced with real Prisma types.
 */

// JSON types
export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
export type JsonObject = { [Key in string]?: JsonValue };
export type JsonArray = JsonValue[];
export type InputJsonValue = string | number | boolean | null | InputJsonObject | InputJsonArray;
export type InputJsonObject = { readonly [Key in string]?: InputJsonValue };
export type InputJsonArray = readonly InputJsonValue[];

// Filter types
export interface StringFilter {
  equals?: string;
  in?: string[];
  notIn?: string[];
  lt?: string;
  lte?: string;
  gt?: string;
  gte?: string;
  contains?: string;
  startsWith?: string;
  endsWith?: string;
  mode?: 'default' | 'insensitive';
  not?: string | StringFilter;
}

export interface DateTimeFilter {
  equals?: Date;
  in?: Date[];
  notIn?: Date[];
  lt?: Date;
  lte?: Date;
  gt?: Date;
  gte?: Date;
  not?: Date | DateTimeFilter;
}

export interface IntFilter {
  equals?: number;
  in?: number[];
  notIn?: number[];
  lt?: number;
  lte?: number;
  gt?: number;
  gte?: number;
  not?: number | IntFilter;
}

// Canvas types
export interface CanvasWhereInput {
  id?: string | StringFilter;
  userId?: string | StringFilter;
  name?: string | StringFilter;
  visibility?: string | StringFilter;
  deletedAt?: Date | DateTimeFilter | null;
  OR?: CanvasWhereInput[];
  AND?: CanvasWhereInput[];
  NOT?: CanvasWhereInput | CanvasWhereInput[];
}

export interface CanvasOrderByWithRelationInput {
  id?: 'asc' | 'desc';
  userId?: 'asc' | 'desc';
  name?: 'asc' | 'desc';
  createdAt?: 'asc' | 'desc';
  updatedAt?: 'asc' | 'desc';
  visibility?: 'asc' | 'desc';
}

export interface CanvasUpdateInput {
  name?: string;
  description?: string | null;
  visibility?: string;
  thumbnail?: string | null;
  gridSettings?: InputJsonValue;
  background?: InputJsonValue;
  shareSettings?: InputJsonValue;
  updatedAt?: Date;
}

// Widget instance types
export interface WidgetInstanceWhereInput {
  id?: string | StringFilter;
  canvasId?: string | StringFilter;
  widgetType?: string | StringFilter;
  deletedAt?: Date | DateTimeFilter | null;
  OR?: WidgetInstanceWhereInput[];
  AND?: WidgetInstanceWhereInput[];
  NOT?: WidgetInstanceWhereInput | WidgetInstanceWhereInput[];
}

export interface WidgetInstanceOrderByWithRelationInput {
  id?: 'asc' | 'desc';
  canvasId?: 'asc' | 'desc';
  zIndex?: 'asc' | 'desc';
  createdAt?: 'asc' | 'desc';
  updatedAt?: 'asc' | 'desc';
}

export interface WidgetInstanceUpdateInput {
  position?: InputJsonValue;
  dimensions?: InputJsonValue;
  state?: InputJsonValue;
  metadata?: InputJsonValue;
  zIndex?: number;
  locked?: boolean;
  visible?: boolean;
  updatedAt?: Date;
}

// Asset types
export interface AssetWhereInput {
  id?: string | StringFilter;
  userId?: string | StringFilter;
  canvasId?: string | StringFilter | null;
  type?: string | StringFilter;
  deletedAt?: Date | DateTimeFilter | null;
  OR?: AssetWhereInput[];
  AND?: AssetWhereInput[];
  NOT?: AssetWhereInput | AssetWhereInput[];
}

export interface AssetOrderByWithRelationInput {
  id?: 'asc' | 'desc';
  userId?: 'asc' | 'desc';
  createdAt?: 'asc' | 'desc';
  updatedAt?: 'asc' | 'desc';
  size?: 'asc' | 'desc';
}

// Widget package types
export interface WidgetPackageWhereInput {
  id?: string | StringFilter;
  authorId?: string | StringFilter;
  name?: string | StringFilter;
  category?: string | StringFilter;
  status?: string | StringFilter;
  deletedAt?: Date | DateTimeFilter | null;
  OR?: WidgetPackageWhereInput[];
  AND?: WidgetPackageWhereInput[];
  NOT?: WidgetPackageWhereInput | WidgetPackageWhereInput[];
}

export interface WidgetPackageOrderByWithRelationInput {
  id?: 'asc' | 'desc';
  name?: 'asc' | 'desc';
  category?: 'asc' | 'desc';
  downloadCount?: 'asc' | 'desc';
  averageRating?: 'asc' | 'desc';
  createdAt?: 'asc' | 'desc';
  updatedAt?: 'asc' | 'desc';
}

// Event record types
export interface EventRecordWhereInput {
  id?: string | StringFilter;
  canvasId?: string | StringFilter;
  eventType?: string | StringFilter;
  channel?: string | StringFilter;
  sourceType?: string | StringFilter | null;
  sourceUserId?: string | StringFilter | null;
  timestamp?: Date | DateTimeFilter;
  OR?: EventRecordWhereInput[];
  AND?: EventRecordWhereInput[];
  NOT?: EventRecordWhereInput | EventRecordWhereInput[];
}

export interface EventRecordOrderByWithRelationInput {
  id?: 'asc' | 'desc';
  canvasId?: 'asc' | 'desc';
  eventType?: 'asc' | 'desc';
  timestamp?: 'asc' | 'desc';
}

// Transaction client type
export interface TransactionClient {
  user: unknown;
  session: unknown;
  canvas: unknown;
  canvasVersion: unknown;
  widgetInstance: unknown;
  pipeline: unknown;
  widgetPackage: unknown;
  widgetPackageVersion: unknown;
  widgetRating: unknown;
  widgetComment: unknown;
  eventRecord: unknown;
  asset: unknown;
  inviteToken: unknown;
}
