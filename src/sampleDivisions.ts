export type DivisionMode = 'ds' | 'gn'

export type SampleDivision = {
  id: string
  label: string
}

export const sampleDivisions: Record<DivisionMode, SampleDivision[]> = {
  ds: [
    { id: 'ds-1', label: 'Galenbidunuwewa' },
    { id: 'ds-2', label: 'Galnewa' },
    { id: 'ds-3', label: 'Horowpathana' },
    { id: 'ds-4', label: 'Ipalogama' },
    { id: 'ds-5', label: 'Kahatagasdigiliya' },
    { id: 'ds-6', label: 'Kebithigollewa' },
    { id: 'ds-7', label: 'Kekirawa' },
    { id: 'ds-8', label: 'Mahawilachchiya' },
  ],
  gn: [
    { id: 'gn-1', label: 'Buddhangala — Padaviya' },
    { id: 'gn-2', label: 'Elikimbulagala — Padaviya' },
    { id: 'gn-3', label: 'Abhayapura — Padaviya' },
    { id: 'gn-4', label: 'Maithreepura — Padaviya' },
    { id: 'gn-5', label: 'Parakramapura — Padaviya' },
    { id: 'gn-6', label: 'Kumbukwewa — Kebithigollewa' },
    { id: 'gn-7', label: 'Kumbukwewa — Medawachchiya' },
    { id: 'gn-8', label: 'Thammennawa — Rambewa' },
  ],
}
