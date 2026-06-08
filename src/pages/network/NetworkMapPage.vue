<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { NCard, NSpace, NButton, NTag, NText, NSpin, NCheckbox } from 'naive-ui'
import type { Map as LeafletMap, LayerGroup, Marker, Polyline } from 'leaflet'
import { ftthApi } from '../../api'

interface MapItem {
  id: string
  type: 'olt' | 'splitter' | 'odp' | 'customer'
  name: string
  latitude?: number
  longitude?: number
  status: string
  parent_id?: string
  total_ports?: number
  used_ports?: number
  connection_status?: string
  pppoe_username?: string
}

const loading = ref(false)
const mapContainer = ref<HTMLDivElement | null>(null)
const items = ref<MapItem[]>([])

const showODP = ref(true)
const showCustomers = ref(true)
const showLines = ref(true)
const showOLT = ref(true)

let leafletMap: LeafletMap | null = null
let odpLayer: LayerGroup | null = null
let customerLayer: LayerGroup | null = null
let lineLayer: LayerGroup | null = null
let oltLayer: LayerGroup | null = null

const stats = computed(() => {
  const olts = items.value.filter(i => i.type === 'olt').length
  const odps = items.value.filter(i => i.type === 'odp').length
  const customers = items.value.filter(i => i.type === 'customer').length
  const online = items.value.filter(i => i.type === 'customer' && i.connection_status === 'online').length
  return { olts, odps, customers, online }
})

async function loadData() {
  loading.value = true
  try {
    const res = await ftthApi.getMapItems()
    items.value = res.data.data ?? []
    if (leafletMap) renderMap()
  } catch (e) {
    console.error('Gagal memuat data peta', e)
  } finally {
    loading.value = false
  }
}

async function initMap() {
  if (!mapContainer.value) return
  const L = await import('leaflet')
  await import('leaflet/dist/leaflet.css')

  leafletMap = L.map(mapContainer.value, { zoomControl: true }).setView([-2.5, 118], 5)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(leafletMap)

  odpLayer = L.layerGroup().addTo(leafletMap)
  customerLayer = L.layerGroup().addTo(leafletMap)
  lineLayer = L.layerGroup().addTo(leafletMap)
  oltLayer = L.layerGroup().addTo(leafletMap)

  await loadData()
}

function makeCircleIcon(L: any, color: string, size = 12) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};border:2px solid #fff;
      box-shadow:0 1px 4px rgba(0,0,0,.5);
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function makeODPIcon(L: any, usedPorts: number, totalPorts: number) {
  const pct = totalPorts > 0 ? usedPorts / totalPorts : 0
  const color = pct >= 1 ? '#ef4444' : pct >= 0.75 ? '#f97316' : pct >= 0.5 ? '#eab308' : '#3b82f6'
  return L.divIcon({
    className: '',
    html: `<div style="
      width:16px;height:16px;border-radius:3px;
      background:${color};border:2px solid #fff;
      box-shadow:0 1px 4px rgba(0,0,0,.5);
      display:flex;align-items:center;justify-content:center;
      font-size:8px;color:#fff;font-weight:bold;
    ">${usedPorts}</div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

function makeCustomerIcon(L: any, connectionStatus: string, status: string) {
  let color = '#6b7280'
  if (status === 'isolated') color = '#ef4444'
  else if (connectionStatus === 'online') color = '#22c55e'
  else if (connectionStatus === 'offline') color = '#ef4444'
  return makeCircleIcon(L, color, 10)
}

async function renderMap() {
  if (!leafletMap) return
  const L = await import('leaflet')

  odpLayer!.clearLayers()
  customerLayer!.clearLayers()
  lineLayer!.clearLayers()
  oltLayer!.clearLayers()

  // Index by id for line drawing
  const byId: Record<string, MapItem> = {}
  for (const item of items.value) {
    if (item.latitude && item.longitude) byId[item.id] = item
  }

  // OLTs
  if (showOLT.value) {
    for (const item of items.value) {
      if (item.type !== 'olt' || !item.latitude || !item.longitude) continue
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:20px;height:20px;border-radius:4px;
          background:#7c3aed;border:2px solid #fff;
          box-shadow:0 1px 6px rgba(0,0,0,.6);
          display:flex;align-items:center;justify-content:center;
          font-size:9px;color:#fff;font-weight:bold;
        ">OLT</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      })
      const marker = L.marker([item.latitude, item.longitude], { icon })
      marker.bindPopup(`
        <b>${item.name}</b><br>
        <span style="color:#7c3aed">OLT</span><br>
        Status: ${item.status}
      `)
      oltLayer!.addLayer(marker)
    }
  }

  // ODPs
  if (showODP.value) {
    for (const item of items.value) {
      if (item.type !== 'odp' || !item.latitude || !item.longitude) continue
      const icon = makeODPIcon(L, item.used_ports ?? 0, item.total_ports ?? 0)
      const marker = L.marker([item.latitude, item.longitude], { icon })
      marker.bindPopup(`
        <b>${item.name}</b><br>
        <span style="color:#3b82f6">ODP</span><br>
        Port: ${item.used_ports ?? 0} / ${item.total_ports ?? 0} terpakai<br>
        Status: ${item.status}
      `)
      odpLayer!.addLayer(marker)
    }
  }

  // Customers
  if (showCustomers.value) {
    for (const item of items.value) {
      if (item.type !== 'customer' || !item.latitude || !item.longitude) continue
      const icon = makeCustomerIcon(L, item.connection_status ?? '', item.status)
      const marker = L.marker([item.latitude, item.longitude], { icon })
      marker.bindPopup(`
        <b>${item.name}</b><br>
        PPPoE: ${item.pppoe_username ?? '-'}<br>
        Koneksi: <b>${item.connection_status ?? '-'}</b><br>
        Status: ${item.status}
      `)
      customerLayer!.addLayer(marker)
    }
  }

  // Lines (jalur): parent → child
  if (showLines.value) {
    for (const item of items.value) {
      if (!item.parent_id || !item.latitude || !item.longitude) continue
      const parent = byId[item.parent_id]
      if (!parent || !parent.latitude || !parent.longitude) continue

      let color = '#94a3b8'
      if (item.type === 'odp') color = '#3b82f6'
      else if (item.type === 'splitter') color = '#a855f7'
      else if (item.type === 'customer') color = '#22c55e'

      const line = L.polyline(
        [[parent.latitude, parent.longitude], [item.latitude, item.longitude]],
        { color, weight: 1.5, opacity: 0.7, dashArray: item.type === 'customer' ? '4 4' : undefined }
      )
      lineLayer!.addLayer(line)
    }
  }

  // Auto-fit bounds if there are visible points
  const allPoints = items.value
    .filter(i => i.latitude && i.longitude)
    .map(i => [i.latitude!, i.longitude!] as [number, number])
  if (allPoints.length > 0) {
    leafletMap.fitBounds(L.latLngBounds(allPoints), { padding: [30, 30] })
  }
}

function toggleLayer(type: 'olt' | 'odp' | 'customer' | 'lines') {
  if (!leafletMap) return
  if (type === 'olt') { showOLT.value = !showOLT.value }
  else if (type === 'odp') { showODP.value = !showODP.value }
  else if (type === 'customer') { showCustomers.value = !showCustomers.value }
  else if (type === 'lines') { showLines.value = !showLines.value }
  renderMap()
}

onMounted(() => initMap())
onUnmounted(() => { leafletMap?.remove(); leafletMap = null })
</script>

<template>
  <div style="padding:16px;display:flex;flex-direction:column;height:calc(100vh - 64px);gap:12px">
    <!-- Header bar -->
    <div style="display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
      <div>
        <div style="font-size:18px;font-weight:600">Peta Jaringan</div>
        <div style="font-size:13px;color:#888;margin-top:2px">
          ODP jalur & modem pelanggan secara real-time
        </div>
      </div>
      <NButton size="small" :loading="loading" @click="loadData">Refresh</NButton>
    </div>

    <!-- Stats row -->
    <div style="display:flex;gap:8px;flex-wrap:wrap;flex-shrink:0">
      <NTag size="small" style="background:#7c3aed20;color:#7c3aed">
        OLT: {{ stats.olts }}
      </NTag>
      <NTag size="small" style="background:#3b82f620;color:#3b82f6">
        ODP: {{ stats.odps }}
      </NTag>
      <NTag size="small" style="background:#6b728020;color:#6b7280">
        Pelanggan: {{ stats.customers }}
      </NTag>
      <NTag size="small" style="background:#22c55e20;color:#22c55e">
        Online: {{ stats.online }}
      </NTag>
    </div>

    <!-- Layer toggles -->
    <div style="display:flex;gap:16px;flex-wrap:wrap;flex-shrink:0;align-items:center">
      <NText depth="3" style="font-size:12px">Tampilkan:</NText>
      <NCheckbox :checked="showOLT" @update:checked="toggleLayer('olt')">
        <span style="color:#7c3aed;font-size:13px">OLT</span>
      </NCheckbox>
      <NCheckbox :checked="showODP" @update:checked="toggleLayer('odp')">
        <span style="color:#3b82f6;font-size:13px">ODP</span>
      </NCheckbox>
      <NCheckbox :checked="showCustomers" @update:checked="toggleLayer('customer')">
        <span style="color:#22c55e;font-size:13px">Modem Pelanggan</span>
      </NCheckbox>
      <NCheckbox :checked="showLines" @update:checked="toggleLayer('lines')">
        <span style="font-size:13px">Jalur Kabel</span>
      </NCheckbox>
    </div>

    <!-- Legend -->
    <div style="display:flex;gap:16px;flex-wrap:wrap;flex-shrink:0;align-items:center;font-size:12px;color:#888">
      <span>
        <span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:#3b82f6;margin-right:4px;vertical-align:middle"></span>
        ODP normal
      </span>
      <span>
        <span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:#eab308;margin-right:4px;vertical-align:middle"></span>
        ODP &ge;50% penuh
      </span>
      <span>
        <span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:#ef4444;margin-right:4px;vertical-align:middle"></span>
        ODP penuh / offline
      </span>
      <span>
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#22c55e;margin-right:4px;vertical-align:middle"></span>
        Pelanggan online
      </span>
      <span>
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#ef4444;margin-right:4px;vertical-align:middle"></span>
        Pelanggan offline/isolir
      </span>
    </div>

    <!-- Map container -->
    <div style="position:relative;flex:1;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.15)">
      <div v-if="loading" style="
        position:absolute;inset:0;z-index:9999;
        display:flex;align-items:center;justify-content:center;
        background:rgba(255,255,255,.7)
      ">
        <NSpin size="large" />
      </div>
      <div ref="mapContainer" style="width:100%;height:100%"></div>
    </div>
  </div>
</template>
