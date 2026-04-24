import { getFarmLogo, LOGO_URL } from '../utils/constants'

interface FarmLogoProps {
  farmName?: string
  type?: 'gestaup' | 'farm' | 'both'
  size?: 'small' | 'medium' | 'large'
  borderRadius?: string
  farmBorderRadius?: string
  className?: string
  gap?: string
}

const SIZES = {
  small: { width: 'w-12', height: 'h-12', farmHeight: 'h-12' },
  medium: { width: 'w-16', height: 'h-auto', farmHeight: 'h-[58px]' },
  large: { width: 'w-24', height: 'h-auto', farmHeight: 'h-[80px]' },
}

const BORDER_RADIUS = 'rounded-[22px]'

export default function FarmLogo({
  farmName,
  type = 'both',
  size = 'medium',
  borderRadius = BORDER_RADIUS,
  farmBorderRadius,
  className = '',
  gap = 'gap-12',
}: FarmLogoProps) {
  const sizeConfig = SIZES[size]
  const farmLogoUrl = farmName ? getFarmLogo(farmName) : null

  // Detectar se é fazenda Sirio para aplicar formato circular
  const isSirio = farmName?.toLowerCase().includes('sirio') || farmName?.toLowerCase().includes('sírio')
  const farmRadius = farmBorderRadius || (isSirio ? 'rounded-full' : borderRadius)

  return (
    <div className={`flex items-center ${gap} ${className}`}>
      {type !== 'farm' && (
        <img
          src={LOGO_URL}
          alt="Logo GestaUp"
          className={`${sizeConfig.width} ${sizeConfig.height} object-contain ${borderRadius} ml-8`}
        />
      )}
      {type !== 'gestaup' && farmName && (
        <img
          src={farmLogoUrl || LOGO_URL}
          alt="Logo Fazenda"
          className={`${sizeConfig.width} ${sizeConfig.farmHeight} w-auto object-contain ${farmRadius} mr-8`}
        />
      )}
    </div>
  )
}
