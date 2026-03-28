export type { Meeting, CreateMeetingInput } from './meeting.schema.js'
export type { Room } from './room.schema.js'
export type { User } from './user.schema.js'

export interface MeetingParticipant {
  meetingId: string
  userId: string
  status: 'pending' | 'confirmed' | 'declined'
}

export interface Notification {
  id: string
  userId: string
  meetingId: string
  type: 'reminder' | 'change' | 'cancel'
  message: string
  read: boolean
  createdAt: string
}

export interface Attachment {
  id: string
  meetingId: string
  fileName: string
  fileSize: number
  url: string
  uploadedAt: string
}
