// Tick-box lists for supplier profiles. Plain data, so browser and server code can both use it.

export const DELIVERY_OPTIONS = [
  { key: 'own-fleet', label: 'We deliver on our own vehicles' },
  { key: 'courier', label: 'We send by courier or pallet network' },
  { key: 'collection', label: 'Collection from our yard or depot' },
  { key: 'site-offload', label: 'Offload to site with HIAB or forklift' },
];

// Optional. Nothing here is needed to join: they are things trade buyers like to see.
export const STANDARDS = [
  { key: 'bs3882', label: 'Topsoil to BS 3882' },
  { key: 'bs8601', label: 'Subsoil to BS 8601' },
  { key: 'bs3936', label: 'Nursery stock to BS 3936' },
  { key: 'plant-passport', label: 'UK plant passport / APHA registered' },
  { key: 'fsc', label: 'FSC or PEFC certified timber' },
  { key: 'iso9001', label: 'ISO 9001 quality management' },
  { key: 'iso14001', label: 'ISO 14001 environmental management' },
  { key: 'peat-free', label: 'Peat-free range' },
  { key: 'bali', label: 'BALI or HTA member' },
  { key: 'constructionline', label: 'Constructionline' },
];
export const standardLabel = (k: string) => STANDARDS.find((s) => s.key === k)?.label ?? k;
