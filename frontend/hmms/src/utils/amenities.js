import {
  Accessibility,
  AirVent,
  AppWindow,
  Armchair,
  ArrowUpDown,
  Baby,
  Ban,
  Bath,
  Bed,
  BedDouble,
  BedSingle,
  Building,
  Building2,
  Check,
  Coffee,
  CookingPot,
  Droplets,
  Fan,
  Heater,
  KeyRound,
  Laptop,
  Microwave,
  Refrigerator,
  Shirt,
  ShowerHead,
  Sofa,
  Sun,
  SunMedium,
  Trees,
  Tv,
  Utensils,
  WashingMachine,
  Wifi,
  Wind,
} from 'lucide-react';

// Amenity keys stored on a suite (comma-separated in the database), with icon and labels.
// Order here is the order used in the Settings editor, and saving there puts a suite's
// amenities in this order, so it is also the order guests see.
export const AMENITIES = {
  // Beds
  double_bed: { icon: BedDouble, en: 'Double bed', es: 'Cama de matrimonio' },
  twin_beds: { icon: BedSingle, en: 'Twin beds', es: 'Camas individuales' },
  extra_bed: { icon: Bed, en: 'Extra bed', es: 'Cama supletoria' },
  sofa_bed: { icon: Sofa, en: 'Sofa bed', es: 'Sofá cama' },
  // Outdoor spaces and views
  patio: { icon: Trees, en: 'Private patio', es: 'Patio de uso exclusivo' },
  private_terrace: { icon: Sun, en: 'Private terrace', es: 'Terraza privada' },
  balcony: { icon: Building, en: 'Balcony', es: 'Balcón' },
  rooftop_solarium: { icon: SunMedium, en: 'Rooftop solarium', es: 'Azotea solárium' },
  city_view: { icon: Building2, en: 'Large windows onto the city', es: 'Amplios ventanales a la ciudad' },
  patio_view: { icon: AppWindow, en: 'Large windows onto the patio', es: 'Amplios ventanales al patio' },
  // Building and access
  accessible: { icon: Accessibility, en: 'Adapted for reduced mobility', es: 'Adaptada a movilidad reducida' },
  elevator: { icon: ArrowUpDown, en: 'Elevator', es: 'Ascensor' },
  self_check_in: { icon: KeyRound, en: 'Self check-in', es: 'Check-in autónomo' },
  // Rooms and kitchen
  living_area: { icon: Armchair, en: 'Living area', es: 'Zona de estar' },
  dining_area: { icon: Utensils, en: 'Dining area', es: 'Comedor' },
  kitchen: { icon: CookingPot, en: 'Equipped kitchen', es: 'Cocina equipada' },
  kitchenette: { icon: Microwave, en: 'Kitchenette', es: 'Cocina pequeña' },
  fridge: { icon: Refrigerator, en: 'Fridge', es: 'Nevera' },
  coffee_machine: { icon: Coffee, en: 'Coffee machine', es: 'Cafetera' },
  washing_machine: { icon: WashingMachine, en: 'Washing machine', es: 'Lavadora' },
  // Comfort
  air_conditioning: { icon: AirVent, en: 'Air conditioning', es: 'Aire acondicionado' },
  heating: { icon: Heater, en: 'Heating', es: 'Calefacción' },
  fan: { icon: Fan, en: 'Ceiling fan', es: 'Ventilador de techo' },
  wifi: { icon: Wifi, en: 'Wi-Fi', es: 'Wi-Fi' },
  smart_tv: { icon: Tv, en: 'Smart TV', es: 'Smart TV' },
  workspace: { icon: Laptop, en: 'Workspace', es: 'Zona de trabajo' },
  // Bathroom
  private_bathroom: { icon: ShowerHead, en: 'Private bathroom', es: 'Baño privado' },
  spacious_bathroom: { icon: Droplets, en: 'Spacious bathroom', es: 'Baño amplio' },
  bathtub: { icon: Bath, en: 'Bathtub', es: 'Bañera' },
  hairdryer: { icon: Wind, en: 'Hairdryer', es: 'Secador de pelo' },
  iron: { icon: Shirt, en: 'Iron', es: 'Plancha' },
  // House rules
  cot_available: { icon: Baby, en: 'Cot on request', es: 'Cuna bajo petición' },
  no_pets: { icon: Ban, en: 'No pets', es: 'No se admiten mascotas' },
};

export const AMENITY_KEYS = Object.keys(AMENITIES);

/** Label in the current language; unknown keys are shown humanized ("sea_view" -> "Sea view"). */
export function amenityLabel(key, tr = (en) => en) {
  const amenity = AMENITIES[key];
  if (amenity) {
    return tr(amenity.en, amenity.es);
  }
  const text = String(key || '').replaceAll('_', ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function amenityIcon(key) {
  return AMENITIES[key]?.icon || Check;
}
