import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { getMeeting, confirmMeeting } from '@/services/api'
import { useAuth } from '@/hooks/use-auth'

interface MeetingDetail {
  id: string
  title: string
  description?: string
  agenda?: string
  startTime: string
  endTime: string
  roomId: string
  hostId: string
  recurrence: string
  status: string
  createdAt: string
  updatedAt: string
  room?: { id: string; name: string; location?: string; capacity: number; equipment: string[]; createdAt: string }
  participants?: { userId: string; name: string; email: string; status: string }[]
}

export function MeetingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMeeting(id!)
      .then(setMeeting)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p>Loading...</p>
  if (!meeting) return <p>Meeting not found.</p>

  const isHost = user?.id === meeting.hostId || user?.role === 'admin'
  const isParticipant = meeting.participants?.some(
    (p) => p.userId === user?.id && p.status === 'pending'
  )

  const handleConfirm = async () => {
    await confirmMeeting(id!)
    const updated = await getMeeting(id!)
    setMeeting(updated)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{meeting.title}</h1>
        <div className="flex gap-2">
          {isHost && (
            <>
              <button
                onClick={() => navigate(`/meetings/${id}/edit`)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Edit
              </button>
              <button
                onClick={() => navigate(`/meetings/${id}/cancel`)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Cancel
              </button>
            </>
          )}
          {isParticipant && (
            <button
              onClick={handleConfirm}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Confirm Attendance
            </button>
          )}
        </div>
      </div>

      {meeting.description && (
        <p className="text-gray-600">{meeting.description}</p>
      )}

      {meeting.agenda && (
        <div>
          <h2 className="font-semibold mb-1">Agenda</h2>
          <pre className="whitespace-pre-wrap text-sm text-gray-600">{meeting.agenda}</pre>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="font-medium">Start:</span>{' '}
          {new Date(meeting.startTime).toLocaleString()}
        </div>
        <div>
          <span className="font-medium">End:</span>{' '}
          {new Date(meeting.endTime).toLocaleString()}
        </div>
        <div>
          <span className="font-medium">Room:</span>{' '}
          {meeting.room?.name ?? 'Unknown'}
        </div>
        <div>
          <span className="font-medium">Recurrence:</span>{' '}
          <span className="capitalize">{meeting.recurrence}</span>
        </div>
      </div>

      {meeting.participants && meeting.participants.length > 0 && (
        <div>
          <h2 className="font-semibold mb-2">Participants</h2>
          <ul className="space-y-1">
            {meeting.participants.map((p) => (
              <li key={p.userId} className="flex items-center justify-between text-sm">
                <span>{p.name}</span>
                <span className={`px-2 py-0.5 text-xs rounded capitalize ${
                  p.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                  p.status === 'declined' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {p.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
