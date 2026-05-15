import { getFarmLogo, LOGO_URL } from '../utils/constants'

interface FarmLogoProps {
  farmName?: string
  logoUrl?: string
  type?: 'gestaup' | 'farm' | 'both'
  size?: 'small' | 'medium' | 'large'
  borderRadius?: string
  farmBorderRadius?: string
  className?: string
  gap?: string
  middleText?: string
}

const SIZES = {
  small: { width: 'w-12', height: 'h-12', farmHeight: 'h-12' },
  medium: { width: 'w-16', height: 'h-16', farmHeight: 'h-16' },
  large: { width: 'w-24', height: 'h-24', farmHeight: 'h-24' },
}

const BORDER_RADIUS = 'rounded-[22px]'

export default function FarmLogo({
  farmName,
  logoUrl,
  type = 'both',
  size = 'medium',
  borderRadius = BORDER_RADIUS,
  farmBorderRadius,
  className = '',
  gap = 'gap-12',
  middleText,
}: FarmLogoProps) {
  const sizeConfig = SIZES[size]
  const farmLogoUrl = (logoUrl && logoUrl.trim() !== '') ? logoUrl : (farmName ? getFarmLogo(farmName) : null)

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
      {middleText && (
        <div className="flex flex-col items-center justify-center gap-1">
          <span className="text-xl font-bold text-white leading-none">Manj'Us</span>
          <span className="text-xl font-bold text-yellow-400 leading-none">360</span>
        </div>
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
