import type { Fields, Presets } from '@openstreetmap/id-tagging-schema';

//
// Hackathon-specific fields and presets for the road graph (UDS) editor.
// They are merged into the official id-tagging-schema data in `presetManager.ensureLoaded()`.
//
// NOTE: the OSM tags for signal timing do not exist in the OSM standard.
// We use the `traffic_signals:*` namespace, so the data stays valid OSM
// and does not clash with the tags of the schema.
//

export const customFields = {
  'hack/signal_cycle': {
    key: 'traffic_signals:cycle',
    type: 'number',
    label: 'Cycle time (s)',
    minValue: 1,
    placeholder: '90'
  },
  'hack/signal_phases': {
    key: 'traffic_signals:phases',
    type: 'text',
    label: 'Phases (type:seconds)',
    placeholder: 'green:35;yellow:3;red:52'
  },
  'hack/signal_offset': {
    key: 'traffic_signals:offset',
    type: 'number',
    label: 'Offset in green wave (s)',
    minValue: 0
  },
  'hack/tram_signal_type': {
    key: 'railway:signal:main',
    type: 'combo',
    label: 'Tram signal type',
    options: ['tram_light', 'tram_priority', 'tram_stop_sign']
  },
  'hack/bench_material': {
    key: 'material',
    type: 'combo',
    label: 'Материал лавочки',
    options: ['wood', 'metal', 'concrete', 'stone', 'plastic', 'composite', 'recycled_plastic']
  },
  'hack/gazebo_type': {
    key: 'gazebo:type',
    type: 'combo',
    label: 'Тип беседки',
    options: ['wooden', 'metal', 'stone', 'brick', 'other']
  },
  'hack/bus_stop_sign': {
    key: 'bus_stop:sign',
    type: 'combo',
    label: 'Тип таблички остановки',
    options: ['mushroom', 'pole', 'none']
  },
  'hack/bus_stop_heating': {
    key: 'heating',
    type: 'combo',
    label: 'Отопление остановки',
    options: ['yes', 'no']
  },
  'hack/bus_stop_waste_basket': {
    key: 'waste_basket',
    type: 'combo',
    label: 'Бак для мусора',
    options: ['yes', 'no']
  },
  'hack/photo_url': {
    key: 'image',
    type: 'text',
    label: 'Ссылка на фото объекта',
    placeholder: 'https://example.com/photo.jpg'
  },
  'hack/object_website': {
    key: 'website',
    type: 'text',
    label: 'Сайт объекта',
    placeholder: 'https://example.com'
  }
} as unknown as Fields;


// Russian traffic signs (PDD). The tag value is `traffic_sign=RU:<number>`, see OSM wiki "Key:traffic sign"
const RU_SIGNS: [code: string, name: string, icon: string][] = [
  ['2.1', 'Главная дорога', 'temaki-traffic_sign'],
  ['2.4', 'Уступите дорогу', 'temaki-yield'],
  ['2.5', 'Движение без остановки запрещено', 'temaki-stop'],
  ['3.1', 'Въезд запрещён', 'temaki-traffic_sign'],
  ['3.2', 'Движение запрещено', 'temaki-traffic_sign'],
  ['3.24', 'Ограничение максимальной скорости', 'temaki-speed_limit'],
  ['4.1.1', 'Движение прямо', 'temaki-traffic_sign'],
  ['4.1.2', 'Движение направо', 'temaki-traffic_sign'],
  ['4.1.3', 'Движение налево', 'temaki-traffic_sign'],
  ['5.19.1', 'Пешеходный переход', 'temaki-pedestrian']
];

const signPresets: Presets = {};
for (const [code, name, icon] of RU_SIGNS) {
  signPresets[`hack/traffic_sign/RU_${code}`] = {
    icon,
    name: `Знак ${code} «${name}»`,
    geometry: ['point', 'vertex'],
    tags: { traffic_sign: `RU:${code}` },
    fields: ['direction', 'traffic_sign', ...(code === '3.24' ? ['maxspeed'] : [])],
    terms: ['знак', 'sign', code]
  } as unknown as Presets[string];
}

// --- Беседка (новый пресет) ---
const gazeboPreset: Presets = {
  'hack/leisure/gazebo': {
    icon: 'iD-icon-gazebo',
    name: 'Беседка',
    geometry: ['point', 'vertex'],
    tags: { leisure: 'gazebo' },
    fields: ['hack/gazebo_type', 'hack/photo_url', 'hack/object_website'],
    moreFields: ['operator', 'ref', 'description'],
    terms: ['беседка', 'газебо', 'gazebo', 'альтанка']
  }
} as unknown as Presets;

// --- Трамвайный сигнал (существующий hackathon-пресет) ---
const tramSignalPreset: Presets = {
  'hack/railway/signal/tram': {
    icon: 'temaki-railway_signals',
    name: 'Tram Signal',
    geometry: ['point', 'vertex'],
    tags: { railway: 'signal', 'railway:signal:main:form': 'light' },
    addTags: { railway: 'signal', 'railway:signal:main:form': 'light', 'railway:signal:main': 'tram_light' },
    fields: ['hack/tram_signal_type', 'railway/signal/direction', 'railway/signal/position', 'hack/signal_cycle', 'hack/signal_phases'],
    moreFields: ['hack/signal_offset', 'ref'],
    terms: ['трамвай', 'tram', 'светофор', 'signal']
  }
} as unknown as Presets;


// Extra fields appended to presets which already exist in id-tagging-schema.
// Расширяем существующие пресеты лавочки и остановки новыми полями.
const EXTRA_FIELDS: Record<string, string[]> = {
  'highway/traffic_signals': ['hack/signal_cycle', 'hack/signal_phases', 'hack/signal_offset'],
  'railway/tram_crossing': ['hack/signal_cycle', 'hack/signal_phases'],

  // Лавочка: добавляем материал, фото, сайт к существующему amenity=bench
  'amenity/bench': ['hack/bench_material', 'hack/photo_url', 'hack/object_website'],

  // Остановка: добавляем тип таблички, отопление, бак, фото, сайт к существующему highway=bus_stop
  'highway/bus_stop': ['hack/bus_stop_sign', 'hack/bus_stop_heating', 'hack/bus_stop_waste_basket', 'hack/photo_url', 'hack/object_website']
};

/** Returns copies of the official `fields` and `presets` extended by the UDS ones. */
export function presetsWithCustom(fields: Fields, presets: Presets): { fields: Fields, presets: Presets } {
  const extended = { ...presets };
  for (const [presetID, extra] of Object.entries(EXTRA_FIELDS)) {
    const base = extended[presetID];
    if (!base) continue;
    // appended after the standard fields of the preset
    extended[presetID] = { ...base, fields: [...(base.fields || []), ...extra] };
  }
  return {
    fields: { ...fields, ...customFields },
    presets: { ...extended, ...gazeboPreset, ...tramSignalPreset, ...signPresets }
  };
}
