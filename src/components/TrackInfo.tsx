import { cn } from '@/lib/utils'

type Props = {
  title: string
  artist: string
  cover?: string
  className?: string
}

export function TrackInfo({ title, artist, cover, className }: Props) {
  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      {cover ? (
        <img src={cover} alt="" className="size-10 shrink-0 rounded-md bg-muted object-cover" />
      ) : (
        <div className="size-10 shrink-0 rounded-md bg-muted" />
      )}
      <div className="min-w-0">
        <div className="truncate font-medium">{title}</div>
        <div className="truncate text-muted-foreground">{artist}</div>
      </div>
    </div>
  )
}
