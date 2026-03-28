import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router'
import { getMeetings } from '@/services/api'
import type { Meeting } from '@meetflow/shared'

const STATUS_FILTERS = ['all', 'scheduled', 'completed', 'cancelled'] as const

export function MeetingListPage() {
  const navigate = useNavigate()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMeetings(statusFilter === 'all' ? undefined : { status: statusFilter })
      .then(setMeetings)
      .finally(() => setLoading(false))
  }, [statusFilter])

  const filtered = statusFilter === 'all'
    ? meetings
    : meetings.filter((m) => m.status === statusFilter)

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Meetings</h1>
        <Link
          to="/meetings/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          New Meeting
        </Link>
      </div>

      <div className="flex gap-2">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1 rounded text-sm capitalize ${
              statusFilter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500">No meetings found.</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((meeting) => (
            <li
              key={meeting.id}
              onClick={() => navigate(`/meetings/${meeting.id}`)}
              className="border rounded p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
            >
              <div>
                <h3 className="font-medium">{meeting.title}</h3>
                <p className="text-sm text-gray-500">
                  {new Date(meeting.startTime).toLocaleString()} — {new Date(meeting.endTime).toLocaleString()}
                </p>
              </div>
              <span className={`px-2 py-1 text-xs rounded capitalize ${
                meeting.status === 'scheduled' ? 'bg-green-100 text-green-700' :
                meeting.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                'bg-red-100 text-red-700'
              }`}>
                {meeting.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
