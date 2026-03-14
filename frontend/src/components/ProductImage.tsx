import { Box } from '@chakra-ui/react'

interface Props {
  src?: string
  /** Width & height. Use 'full' for aspect-ratio 1:1 full-width grid cards, or a pixel number for thumbnails. */
  size?: 'full' | number
  radius?: number
}

export function ProductImage({ src, size = 'full', radius = 8 }: Props) {
  const w = size === 'full' ? '100%' : size
  const style: React.CSSProperties = {
    width: w,
    aspectRatio: '1',
    objectFit: 'cover',
    display: 'block',
    borderRadius: radius,
    flexShrink: 0,
  }
  if (src) return <img src={src} style={style} />
  return <Box bg="gray.100" style={{ ...style, objectFit: undefined }} />
}
