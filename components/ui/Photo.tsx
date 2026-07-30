import Image from 'next/image'
import { cn } from '@/lib/cn'

/*
  A real factory photo in the same frame the placeholders use: identical ring,
  radius and minimum height, so swapping one for the other never moves layout.
  The current sources are 420px strips recovered from the old site, shown
  object-cover; when the proper shoot arrives the files are replaced and this
  component does not change.
*/
export function Photo({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'ring-glass relative min-h-[320px] overflow-hidden rounded-[2rem] bg-white/[0.02]',
        className,
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="object-cover"
      />
    </div>
  )
}
