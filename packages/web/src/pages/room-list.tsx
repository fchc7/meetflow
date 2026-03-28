import { useState, useEffect } from 'react'
import { getRooms } from '@/services/api'
import type { Room } from '@meetflow/shared'

export function RoomListPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRooms()
      .then(setRooms)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p>Loading...</p>

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Meeting Rooms</h1>

      {rooms.length === 0 ? (
        <p className="text-gray-500">No rooms available.</p>
      ) : (
        <ul className="space-y-3">
          {rooms.map((room) => (
            <li key={room.id} className="border rounded p-4">
              <h3 className="font-medium">{room.name}</h3>
              {room.location && (
                <p className="text-sm text-gray-500">{room.location}</p>
              )}
              <p className="text-sm text-gray-500">
                Capacity: {room.capacity}
              </p>
              {room.equipment.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {room.equipment.map((item) => (
                    <span
                      key={item}
                      className="px-2 py-0.5 text-xs bg-gray-100 rounded"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
