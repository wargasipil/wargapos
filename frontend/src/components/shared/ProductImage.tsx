import { useState } from 'react'
import { Box, Image } from '@chakra-ui/react'
import { ImageOff } from 'lucide-react'

interface Props {
  src?: string
  /** Width & height. Use 'full' for aspect-ratio 1:1 full-width grid cards, or a pixel number for thumbnails. */
  size?: 'full' | number
  radius?: number
}

export function ProductImage({ src, size = 'full', radius = 8 }: Props) {
  const [errored, setErrored] = useState(false)
  const w = size === 'full' ? '100%' : size

  const shared = {
    w,
    aspectRatio: '1/1',
    borderRadius: radius,
    flexShrink: 0,
    overflow: 'hidden',
  } as const

  if (!src || errored) {
    return (
      <Box bg="gray.100" display="flex" alignItems="center" justifyContent="center" {...shared}>
        <ImageOff size={20} color="var(--chakra-colors-gray-400)" />
      </Box>
    )
  }

  return (
    <Image
      src={src}
      objectFit="cover"
      display="block"
      onError={() => setErrored(true)}
      {...shared}
    />
  )
}
