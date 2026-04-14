import {
  IMG_PANEER_TIKKA,
  IMG_SAMOSA,
  IMG_TANDOORI_CHICKEN,
  IMG_SPRING_ROLLS,
  IMG_BUTTER_CHICKEN,
  IMG_PALAK_PANEER,
  IMG_DAL_MAKHANI,
  IMG_BUTTER_NAAN,
  IMG_ROTI,
  IMG_HYDERABADI_BIRYANI,
  IMG_JEERA_RICE,
  IMG_GULAB_JAMUN,
  IMG_RASMALAI,
  IMG_MANGO_LASSI,
  IMG_MASALA_CHAI,
  IMG_RAITA,
  IMG_PICKLE_PAPAD,
} from '../assets/food-images';

export interface FoodItem {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  plateSection: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'left' | 'right';
}

export interface Category {
  name: string;
  icon: string;
  items: FoodItem[];
}

export const categories: Category[] = [
  {
    name: 'Starters',
    icon: '🥘',
    items: [
      { id: 's1', name: 'Paneer Tikka', price: 45, image: IMG_PANEER_TIKKA, category: 'Starters', plateSection: 'top-left' },
      { id: 's2', name: 'Samosa', price: 25, image: IMG_SAMOSA, category: 'Starters', plateSection: 'top-left' },
      { id: 's3', name: 'Tandoori Chicken', price: 55, image: IMG_TANDOORI_CHICKEN, category: 'Starters', plateSection: 'top-left' },
      { id: 's4', name: 'Spring Rolls', price: 30, image: IMG_SPRING_ROLLS, category: 'Starters', plateSection: 'top-left' },
    ],
  },
  {
    name: 'Main Course',
    icon: '🍛',
    items: [
      { id: 'm1', name: 'Butter Chicken', price: 65, image: IMG_BUTTER_CHICKEN, category: 'Main Course', plateSection: 'center' },
      { id: 'm2', name: 'Palak Paneer', price: 55, image: IMG_PALAK_PANEER, category: 'Main Course', plateSection: 'center' },
      { id: 'm3', name: 'Dal Makhani', price: 45, image: IMG_DAL_MAKHANI, category: 'Main Course', plateSection: 'center' },
    ],
  },
  {
    name: 'Breads',
    icon: '🫓',
    items: [
      { id: 'b1', name: 'Butter Naan', price: 15, image: IMG_BUTTER_NAAN, category: 'Breads', plateSection: 'left' },
      { id: 'b2', name: 'Roti', price: 10, image: IMG_ROTI, category: 'Breads', plateSection: 'left' },
    ],
  },
  {
    name: 'Rice',
    icon: '🍚',
    items: [
      { id: 'r1', name: 'Hyderabadi Biryani', price: 75, image: IMG_HYDERABADI_BIRYANI, category: 'Rice', plateSection: 'right' },
      { id: 'r2', name: 'Jeera Rice', price: 35, image: IMG_JEERA_RICE, category: 'Rice', plateSection: 'right' },
    ],
  },
  {
    name: 'Desserts',
    icon: '🍮',
    items: [
      { id: 'd1', name: 'Gulab Jamun', price: 30, image: IMG_GULAB_JAMUN, category: 'Desserts', plateSection: 'bottom-right' },
      { id: 'd2', name: 'Rasmalai', price: 40, image: IMG_RASMALAI, category: 'Desserts', plateSection: 'bottom-right' },
    ],
  },
  {
    name: 'Drinks',
    icon: '🥤',
    items: [
      { id: 'dr1', name: 'Mango Lassi', price: 25, image: IMG_MANGO_LASSI, category: 'Drinks', plateSection: 'bottom-left' },
      { id: 'dr2', name: 'Masala Chai', price: 15, image: IMG_MASALA_CHAI, category: 'Drinks', plateSection: 'bottom-left' },
    ],
  },
  {
    name: 'Add-ons',
    icon: '✨',
    items: [
      { id: 'a1', name: 'Raita', price: 15, image: IMG_RAITA, category: 'Add-ons', plateSection: 'top-right' },
      { id: 'a2', name: 'Pickle & Papad', price: 10, image: IMG_PICKLE_PAPAD, category: 'Add-ons', plateSection: 'top-right' },
    ],
  },
];
