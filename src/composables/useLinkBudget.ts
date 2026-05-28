/**
 * FTTH Link Budget Calculator
 *
 * Menghitung redaman (loss) dari OLT ke ODP secara cascaded.
 * Power awal dari SFP Rx Power di port OLT, kemudian setiap ODP
 * mengambil sebagian sinyal (rasio) dan meneruskan sisanya ke ODP berikutnya.
 */

// Konstanta loss standar fiber optik (dBm)
export const FIBER_LOSS_PER_KM = 0.35       // loss per km kabel fiber
export const PIGTAIL_LOSS = 0.30            // loss per pigtail
export const CONNECTOR_LOSS = 0.25          // loss per konektor/barel
export const SPLICE_LOSS = 0.10             // loss per sambungan/splice

// Loss splitter berdasarkan rasio (dB)
export const SPLITTER_LOSS: Record<string, number> = {
  '1:2': 3.70,
  '1:4': 7.40,
  '1:8': 10.38,
  '1:16': 13.50,
  '1:32': 17.10,
  '1:64': 20.50,
}

// Loss rasio berdasarkan persentase (dB)
// Rasio = berapa % sinyal yang diambil ODP ini, sisanya diteruskan
export const RATIO_LOSS: Record<number, { taken: number; passed: number }> = {
  5:   { taken: 13.21, passed: 0.42 },
  10:  { taken: 10.01, passed: 0.79 },
  15:  { taken: 8.40,  passed: 0.75 },
  20:  { taken: 7.19,  passed: 1.17 },
  25:  { taken: 6.26,  passed: 1.46 },
  30:  { taken: 5.50,  passed: 1.86 },
  35:  { taken: 4.95,  passed: 2.09 },
  40:  { taken: 4.35,  passed: 2.55 },
  45:  { taken: 3.80,  passed: 3.10 },
  50:  { taken: 3.21,  passed: 3.21 },
  100: { taken: 0,     passed: 99   },
}

export interface InstallationParams {
  cableLength: number       // panjang kabel (meter)
  pigtailCount: number      // jumlah pigtail
  connectorCount: number    // jumlah konektor
  spliceCount: number       // jumlah sambungan
}

export interface OdpCalcInput {
  ratioPercent: number       // rasio % yg diambil ODP ini (5, 10, 15, ..., 50)
  splitterType: string       // tipe splitter: '1:8', '1:16', dll
  // Instalasi OLT/ODP sebelumnya → ODP ini (jalur rasio)
  installation: InstallationParams
  // Instalasi rasio → splitter (jalur splitter)
  splitterInstallation: InstallationParams
}

export interface OdpCalcResult {
  sequence: number
  // Sinyal masuk ke ODP
  inputPower: number
  // Loss instalasi kabel ke ODP ini
  installationLoss: number
  // Power setelah loss instalasi
  afterInstallation: number
  // Loss rasio (yang diambil ODP ini)
  ratioLoss: number
  // Power yang diteruskan ke ODP berikutnya
  outputPower: number
  // Power yang masuk ke cabang splitter ODP ini
  ratioTakenPower: number
  // Loss instalasi ke splitter
  splitterInstallationLoss: number
  // Power masuk splitter
  inSplitter: number
  // Loss splitter
  splitterLoss: number
  // Power di setiap port splitter (redaman akhir per pelanggan)
  outSplitter: number
  // Status kualitas sinyal di port splitter
  signalStatus: 'good' | 'warning' | 'critical'
}

/**
 * Hitung loss dari parameter instalasi
 */
export function calcInstallationLoss(params: InstallationParams): number {
  const cableLoss = (params.cableLength / 1000) * FIBER_LOSS_PER_KM
  const pigtailLoss = params.pigtailCount * PIGTAIL_LOSS
  const connectorLoss = params.connectorCount * CONNECTOR_LOSS
  const spliceLoss = params.spliceCount * SPLICE_LOSS
  return cableLoss + pigtailLoss + connectorLoss + spliceLoss
}

/**
 * Hitung link budget untuk satu ODP
 */
export function calcOdpBudget(
  inputPower: number,
  odp: OdpCalcInput,
  sequence: number
): OdpCalcResult {
  // 1. Loss instalasi kabel menuju ODP
  const installationLoss = calcInstallationLoss(odp.installation)
  const afterInstallation = inputPower - installationLoss

  // 2. Rasio — sinyal dibagi: sebagian diambil, sisanya diteruskan
  const ratio = RATIO_LOSS[odp.ratioPercent] || RATIO_LOSS[50]
  const ratioTakenPower = afterInstallation - ratio.taken
  const outputPower = afterInstallation - ratio.passed

  // 3. Jalur splitter — dari rasio ke splitter
  const splitterInstallationLoss = calcInstallationLoss(odp.splitterInstallation)
  const inSplitter = ratioTakenPower - splitterInstallationLoss

  // 4. Loss splitter
  const splitterLoss = SPLITTER_LOSS[odp.splitterType] || 10.38
  const outSplitter = inSplitter - splitterLoss

  // 5. Status berdasarkan power di port splitter
  let signalStatus: 'good' | 'warning' | 'critical' = 'good'
  if (outSplitter < -28) signalStatus = 'critical'
  else if (outSplitter < -24) signalStatus = 'warning'

  return {
    sequence,
    inputPower,
    installationLoss,
    afterInstallation,
    ratioLoss: ratio.passed,
    outputPower,
    ratioTakenPower,
    splitterInstallationLoss,
    inSplitter,
    splitterLoss,
    outSplitter,
    signalStatus,
  }
}

/**
 * Hitung link budget untuk seluruh chain ODP dari satu OLT port
 */
export function calcChainBudget(
  oltPower: number,
  odps: OdpCalcInput[]
): OdpCalcResult[] {
  const results: OdpCalcResult[] = []
  let currentPower = oltPower

  for (let i = 0; i < odps.length; i++) {
    const result = calcOdpBudget(currentPower, odps[i], i + 1)
    results.push(result)
    // Sisa power diteruskan ke ODP berikutnya
    currentPower = result.outputPower
  }

  return results
}

/**
 * Status signal → label & warna
 */
export function signalStatusLabel(status: 'good' | 'warning' | 'critical') {
  switch (status) {
    case 'good': return { label: 'Baik', color: '#18a058' }
    case 'warning': return { label: 'Perhatian', color: '#f0a020' }
    case 'critical': return { label: 'Kritis', color: '#d03050' }
  }
}
