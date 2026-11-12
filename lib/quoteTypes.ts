// Shared lists for estimate requests (used by both server and browser code).
// Sizes follow the categories in the HTA National Plant Specification so quotes compare like for like.

export const QUOTE_CATEGORIES: { key: string; label: string; units: string[] }[] = [
  { key: 'trees-plants', label: 'Trees, shrubs and hedging', units: ['each'] },
  { key: 'soil-aggregates', label: 'Soil, mulch and aggregates', units: ['m³', 'tonne', 'bulk bag', 'each'] },
  { key: 'turf-seed', label: 'Turf, seed and turf care', units: ['m²', 'kg', 'roll', 'each'] },
  { key: 'landscape-products', label: 'Tree pits, drainage and landscape products', units: ['each', 'm', 'm²', 'roll', 'kit'] },
  { key: 'fencing-gates', label: 'Fencing and gates', units: ['m', 'each', 'panel'] },
  { key: 'paving-stone', label: 'Paving, kerbs and stone', units: ['m²', 'm', 'each', 'tonne', 'pack'] },
  { key: 'artificial-play', label: 'Artificial grass, play and sports surfacing', units: ['m²', 'roll', 'each'] },
  { key: 'merchant', label: 'Other materials', units: ['each', 'bag', 'm', 'm²', 'tonne', 'pack'] },
];
export const quoteCategoryLabel = (k: string) => QUOTE_CATEGORIES.find((c) => c.key === k)?.label ?? k;
export const ALL_UNITS = Array.from(new Set(QUOTE_CATEGORIES.flatMap((c) => c.units)));

export const ROOT_TYPES: { key: string; label: string }[] = [
  { key: 'container', label: 'Container (pot)' },
  { key: 'rootball', label: 'Rootballed' },
  { key: 'bareroot', label: 'Bare root' },
  { key: 'cell', label: 'Cell grown / plug' },
  { key: 'airpot', label: 'Air-pot' },
];
export const rootLabel = (k: string | null | undefined) => (k ? ROOT_TYPES.find((r) => r.key === k)?.label ?? k : '');

export const PLANT_SIZES = [
  // pot sizes
  'P9', '1L', '1.5L', '2L', '3L', '5L', '7.5L', '10L', '12L', '15L', '20L', '25L', '35L', '45L', '50L', '70L', '90L', '110L', '130L',
  // heights
  '20-40cm', '40-60cm', '60-80cm', '80-100cm', '100-125cm', '125-150cm', '150-175cm', '175-200cm', '200-250cm', '250-300cm', '300-350cm', '350-400cm',
  // tree girths (measured at 1m)
  '6-8cm girth', '8-10cm girth', '10-12cm girth', '12-14cm girth', '14-16cm girth', '16-18cm girth', '18-20cm girth', '20-25cm girth', '25-30cm girth', '30-35cm girth',
  // forms
  'Feathered', 'Light standard', 'Standard', 'Selected standard', 'Heavy standard', 'Extra heavy standard', 'Multi-stem', 'Half standard', 'Whip', 'Transplant',
];

export const MATERIAL_SPECS = [
  'BS 3882 multipurpose topsoil', 'BS 3882 low fertility topsoil', 'Subsoil', 'Tree pit soil', 'Amenity bark mulch', 'Ornamental bark mulch',
  'Composted wood chip', 'Rootball anchor kit', 'Underground guying kit', 'Irrigation pipe kit', 'Tree stake and tie', 'Root barrier',
  'Rabbit spiral guard', 'Cane and spiral', 'Rolled turf, amenity grade', 'Rolled turf, premium grade', 'Wildflower turf', 'Amenity grass seed',
  'Wildflower seed mix', 'Type 1 sub-base', '20mm shingle', 'Sharp sand', 'Building sand',
];

/** Commonly specified commercial landscape plants. Members can still type anything not listed. */
export const PLANTS = [
  // trees
  'Acer campestre', 'Acer campestre Elsrijk', 'Acer freemanii Autumn Blaze', 'Acer griseum', 'Acer palmatum', 'Acer palmatum Bloodgood',
  'Acer palmatum Osakazuki', 'Acer platanoides', 'Acer platanoides Columnare', 'Acer pseudoplatanus', 'Acer rubrum', 'Acer rubrum October Glory',
  'Alnus cordata', 'Alnus glutinosa', 'Alnus glutinosa Imperialis', 'Amelanchier lamarckii', 'Amelanchier arborea Robin Hill', 'Betula pendula',
  'Betula utilis var. jacquemontii', 'Betula nigra', 'Betula pubescens', 'Carpinus betulus', 'Carpinus betulus Fastigiata', 'Carpinus betulus Frans Fontaine',
  'Castanea sativa', 'Cercis siliquastrum', 'Corylus colurna', 'Crataegus monogyna', 'Crataegus laevigata Paul\'s Scarlet', 'Crataegus prunifolia',
  'Fagus sylvatica', 'Fagus sylvatica Dawyck', 'Fraxinus ornus', 'Ginkgo biloba', 'Gleditsia triacanthos Sunburst', 'Liquidambar styraciflua',
  'Liquidambar styraciflua Worplesdon', 'Liriodendron tulipifera', 'Magnolia kobus', 'Malus Evereste', 'Malus Red Sentinel', 'Malus sylvestris',
  'Malus John Downie', 'Parrotia persica', 'Pinus sylvestris', 'Platanus x hispanica', 'Prunus avium', 'Prunus avium Plena', 'Prunus Amanogawa',
  'Prunus Kanzan', 'Prunus Accolade', 'Prunus padus', 'Prunus Umineko', 'Prunus serrula', 'Pyrus calleryana Chanticleer', 'Quercus robur',
  'Quercus palustris', 'Quercus petraea', 'Quercus ilex', 'Quercus rubra', 'Sorbus aria', 'Sorbus aria Lutescens', 'Sorbus aucuparia',
  'Sorbus aucuparia Sheerwater Seedling', 'Sorbus Joseph Rock', 'Sorbus torminalis', 'Tilia cordata', 'Tilia cordata Greenspire',
  'Tilia x europaea Pallida', 'Tilia platyphyllos', 'Ulmus Lutece', 'Zelkova serrata', 'Salix alba', 'Populus tremula', 'Taxus baccata',
  // native hedging and whips
  'Cornus sanguinea', 'Corylus avellana', 'Euonymus europaeus', 'Ilex aquifolium', 'Ligustrum vulgare', 'Prunus spinosa', 'Rosa canina',
  'Rosa arvensis', 'Viburnum opulus', 'Viburnum lantana', 'Rhamnus cathartica', 'Frangula alnus', 'Sambucus nigra', 'Salix caprea',
  'Lonicera periclymenum', 'Native mixed hedging',
  // formal hedging
  'Buxus sempervirens', 'Carpinus betulus hedging', 'Fagus sylvatica hedging', 'Fagus sylvatica Purpurea hedging', 'Griselinia littoralis',
  'Ligustrum ovalifolium', 'Prunus laurocerasus', 'Prunus laurocerasus Novita', 'Prunus laurocerasus Otto Luyken', 'Prunus lusitanica',
  'Photinia x fraseri Red Robin', 'Taxus baccata hedging', 'Thuja plicata', 'Elaeagnus x ebbingei', 'Ilex crenata', 'Lonicera nitida',
  'Escallonia Apple Blossom', 'Escallonia Red Hedger', 'Pittosporum tenuifolium', 'Osmanthus x burkwoodii', 'Euonymus japonicus',
  // shrubs
  'Abelia x grandiflora', 'Berberis darwinii', 'Berberis thunbergii Atropurpurea Nana', 'Brachyglottis Sunshine', 'Buddleja davidii',
  'Ceanothus Concha', 'Ceanothus thyrsiflorus var. repens', 'Choisya ternata', 'Choisya ternata Sundance', 'Choisya x dewitteana White Dazzler',
  'Cistus x corbariensis', 'Cornus alba Sibirica', 'Cornus sericea Flaviramea', 'Cornus kousa', 'Cotoneaster dammeri', 'Cotoneaster franchetii',
  'Cotoneaster horizontalis', 'Cotoneaster Coral Beauty', 'Daphne odora', 'Deutzia gracilis', 'Escallonia Iveyi', 'Euonymus fortunei Emerald Gaiety',
  'Euonymus fortunei Emerald n Gold', 'Euonymus fortunei Silver Queen', 'Fatsia japonica', 'Hebe Autumn Glory', 'Hebe Great Orme',
  'Hebe Green Globe', 'Hebe pinguifolia Pagei', 'Hebe rakaiensis', 'Hebe Red Edge', 'Hebe Midsummer Beauty', 'Hydrangea macrophylla',
  'Hydrangea paniculata Limelight', 'Hydrangea paniculata Vanille Fraise', 'Hydrangea arborescens Annabelle', 'Hypericum Hidcote',
  'Ilex crenata Dark Green', 'Lavandula angustifolia', 'Lavandula angustifolia Hidcote', 'Lavandula angustifolia Munstead',
  'Lavandula x intermedia Grosso', 'Lonicera pileata', 'Mahonia aquifolium', 'Mahonia x media Charity', 'Mahonia eurybracteata Soft Caress',
  'Nandina domestica', 'Nandina domestica Fire Power', 'Philadelphus Belle Etoile', 'Phlomis fruticosa', 'Pachysandra terminalis',
  'Perovskia Blue Spire', 'Pittosporum Golf Ball', 'Pittosporum tobira Nanum', 'Potentilla fruticosa Abbotswood', 'Potentilla fruticosa Goldfinger',
  'Rosmarinus officinalis', 'Rosmarinus officinalis Prostratus', 'Rosa rugosa', 'Rosa Kent', 'Salvia Caradonna', 'Salvia rosmarinus',
  'Santolina chamaecyparissus', 'Sarcococca confusa', 'Sarcococca hookeriana var. humilis', 'Skimmia japonica', 'Skimmia japonica Rubella',
  'Skimmia x confusa Kew Green', 'Spiraea japonica Goldflame', 'Spiraea japonica Anthony Waterer', 'Spiraea nipponica Snowmound',
  'Symphoricarpos x chenaultii Hancock', 'Viburnum davidii', 'Viburnum tinus', 'Viburnum tinus Eve Price', 'Viburnum x bodnantense Dawn',
  'Viburnum plicatum Mariesii', 'Vinca minor', 'Vinca major', 'Weigela florida Variegata', 'Hedera helix', 'Hedera hibernica',
  'Trachelospermum jasminoides', 'Parthenocissus tricuspidata', 'Clematis montana', 'Phormium tenax', 'Cordyline australis', 'Yucca filamentosa',
  // perennials and grasses
  'Achillea millefolium', 'Agapanthus Headbourne Hybrids', 'Alchemilla mollis', 'Anemone x hybrida Honorine Jobert', 'Astrantia major',
  'Bergenia cordifolia', 'Brunnera macrophylla Jack Frost', 'Calamagrostis x acutiflora Karl Foerster', 'Carex morrowii Ice Dance',
  'Carex oshimensis Evergold', 'Carex pendula', 'Carex testacea', 'Deschampsia cespitosa', 'Echinacea purpurea', 'Epimedium x versicolor Sulphureum',
  'Erigeron karvinskianus', 'Eryngium bourgatii', 'Euphorbia amygdaloides var. robbiae', 'Euphorbia characias subsp. wulfenii', 'Festuca glauca',
  'Geranium Rozanne', 'Geranium macrorrhizum', 'Geranium sanguineum', 'Geranium x cantabrigiense Biokovo', 'Hakonechloa macra',
  'Helleborus x hybridus', 'Hemerocallis Stella de Oro', 'Heuchera Palace Purple', 'Iris sibirica', 'Kniphofia', 'Lamium maculatum',
  'Liriope muscari', 'Luzula sylvatica', 'Miscanthus sinensis', 'Miscanthus sinensis Gracillimus', 'Molinia caerulea', 'Nepeta x faassenii',
  'Nepeta Six Hills Giant', 'Ophiopogon planiscapus Nigrescens', 'Panicum virgatum', 'Pennisetum alopecuroides Hameln', 'Persicaria affinis',
  'Persicaria amplexicaulis', 'Polystichum setiferum', 'Dryopteris filix-mas', 'Rudbeckia fulgida Goldsturm', 'Salvia nemorosa',
  'Sedum spectabile', 'Sesleria autumnalis', 'Stachys byzantina', 'Stipa tenuissima', 'Stipa gigantea', 'Verbena bonariensis',
  'Waldsteinia ternata', 'Tellima grandiflora', 'Asplenium scolopendrium', 'Ajuga reptans', 'Thymus serpyllum',
  // bulbs and plugs
  'Narcissus mixed', 'Crocus mixed', 'Allium Purple Sensation', 'Hyacinthoides non-scripta', 'Galanthus nivalis', 'Wildflower plugs',
];
