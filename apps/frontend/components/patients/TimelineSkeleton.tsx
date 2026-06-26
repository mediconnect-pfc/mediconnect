export default function TimelineSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-lg border bg-white p-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <div className="h-3 w-20 rounded bg-gray-200" />
                <div className="h-3 w-16 rounded bg-gray-200" />
              </div>
              <div className="h-4 w-3/4 rounded bg-gray-200" />
              <div className="h-3 w-1/2 rounded bg-gray-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
