import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { createMeeting, getRooms } from '@/services/api'

export function CreateMeetingPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [agenda, setAgenda] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [roomId, setRoomId] = useState('')
  const [recurrence, setRecurrence] = useState('none')
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    getRooms().then(setRooms)
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      await createMeeting({
        title,
        description: description || undefined,
        agenda: agenda || undefined,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        roomId,
        recurrence,
        participantIds: [],
      })
      navigate('/meetings')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create meeting')
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Create Meeting</h1>

      {error && (
        <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 rounded">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">Title</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded px-3 py-2"
            rows={3}
          />
        </div>

        <div>
          <label htmlFor="agenda" className="block text-sm font-medium mb-1">Agenda</label>
          <textarea
            id="agenda"
            value={agenda}
            onChange={(e) => setAgenda(e.target.value)}
            className="w-full border rounded px-3 py-2"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startTime" className="block text-sm font-medium mb-1">Start Time</label>
            <input
              id="startTime"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="endTime" className="block text-sm font-medium mb-1">End Time</label>
            <input
              id="endTime"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label htmlFor="room" className="block text-sm font-medium mb-1">Room</label>
          <select
            id="room"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            required
            className="w-full border rounded px-3 py-2"
          >
            <option value="">Select a room</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="recurrence" className="block text-sm font-medium mb-1">Recurrence</label>
          <select
            id="recurrence"
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="none">None</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Create Meeting
        </button>
      </form>
    </div>
  )
}
