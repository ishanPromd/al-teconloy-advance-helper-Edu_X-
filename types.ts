

export enum Language {
  ENGLISH = 'English',
  SINHALA = 'Sinhala'
}

export type Subject = 'General' | 'SFT' | 'ICT' | 'ET' | 'Agriculture' | 'Website Admin';

export interface Attachment {
  id: string;
  type: 'image' | 'file';
  mimeType: string;
  content: string; // Base64 string
  name: string;
}

export interface DeliveryInfo {
  deliveredAt: number;
  seenAt: number;
}

export interface ReplyInfo {
  id: string;
  content: string;
  senderName: string;
  isImage: boolean;
}

export interface GroundingMetadata {
  groundingChunks?: {
    web?: { uri?: string; title?: string };
  }[];
  groundingSupports?: any[];
  webSearchQueries?: string[];
  searchEntryPoint?: any;
}

export interface ClassSession {
  status: string;
  link?: string;
  topic?: string;
}

export interface Student {
  website_user_id: string;
  tracking_number: string;
  student_id: string;
  full_name: string;
  gender?: string; // Added optional gender
  school: string;
  stream: string;
  district: string;
  last_paper_marks: string;
  payment_this_month: string;
  id_verified: string; // "TRUE" or "FALSE"
  email: string;
  email_verified: string; // "TRUE" or "FALSE"
}

export interface StudentCardData {
  name: string;
  id: string;
  payment: string;
  verified: string; // "TRUE" | "FALSE" (ID Verified)
  email_verified: string; // "TRUE" | "FALSE"
  tracking?: string;
  last_paper_marks?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  isError?: boolean;
  attachments?: Attachment[];
  generatedImages?: string[]; // Array of base64 data URIs
  groundingMetadata?: GroundingMetadata; // For search sources
  isSystem?: boolean;
  mode?: 'AI' | 'ADMIN'; // Track which mode generated this message
  deliveryInfo?: DeliveryInfo; // For Admin messages
  adminName?: string; // The specific admin name
  replyTo?: ReplyInfo; // Reference to the message being replied to
  studentCard?: StudentCardData; // Parsed student data for UI
}

export interface ChatSession {
  id: string;
  title: string;
  date: Date;
}

export interface AdminAgent {
  id: string;
  name: string;
  intro: string;
}