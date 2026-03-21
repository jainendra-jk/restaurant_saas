export type OrderStatus = 'new' | 'preparing' | 'served';

export interface OrderLine {
  displayName: string;
  portion?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  selectedOption?: string;
}

export interface Order {
  orderNumber: string;
  placedAt: string; // ISO 8601
  tableNo: string;
  restaurantName: string;
  customerName?: string;
  specialInstructions?: string;
  lines: OrderLine[];
  status: OrderStatus;
  subTotal: number;
  tax: number;
  total: number;
}

export interface Table {
  id: string;
  number: number;
  status: 'active' | 'inactive';
  seats: number;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  categories: string[];
  image: string;
  isVeg: boolean;
  isAvailable: boolean;
  description: string;
  sizes?: { label: string; price: number }[];
  flavours?: string[];
}

function line(displayName: string, quantity: number, unitPrice: number, portion?: string, selectedOption?: string): OrderLine {
  return { displayName, portion, quantity, unitPrice, lineTotal: quantity * unitPrice, selectedOption };
}

function order(
  orderNumber: string,
  placedAt: string,
  tableNo: string,
  status: OrderStatus,
  total: number,
  lines: OrderLine[],
  customerName?: string,
  specialInstructions?: string,
  tax = 0
): Order {
  const subTotal = total - tax;
  return {
    orderNumber,
    placedAt,
    tableNo,
    restaurantName: 'Spice Garden',
    customerName,
    specialInstructions,
    lines,
    status,
    subTotal,
    tax,
    total,
  };
}

export const initialOrders: Order[] = [
  order('ord-001', '2026-03-15T12:34:00.000Z', '3', 'new', 940, [line('Paneer Butter Masala', 2, 320), line('Butter Naan', 3, 60), line('Coke', 1, 80)], 'John Doe', 'No onion, no garlic — Jain preparation please'),
  order('ord-002', '2026-03-15T12:38:00.000Z', '7', 'new', 1200, [line('Chicken Biryani', 2, 380), line('Raita', 2, 60), line('Gulab Jamun', 4, 80)], 'Jane Smith'),
  order('ord-003', '2026-03-15T12:20:00.000Z', '1', 'preparing', 700, [line('Dal Makhani', 1, 280), line('Jeera Rice', 1, 180), line('Mango Lassi', 2, 120)], 'Alice Johnson', 'Customer has nut allergy — avoid all nuts and peanut oil'),
  order('ord-004', '2026-03-15T12:10:00.000Z', '5', 'preparing', 710, [line('Tandoori Chicken', 1, 450), line('Roomali Roti', 4, 50), line('Onion Salad', 1, 60)], 'Bob Brown'),
  order('ord-005', '2026-03-15T12:05:00.000Z', '12', 'preparing', 300, [line('Veg Samosa', 6, 40), line('Green Chutney', 2, 30)], 'Charlie Davis'),
  order('ord-006', '2026-03-15T11:45:00.000Z', '9', 'served', 820, [line('Paneer Tikka', 1, 320), line('Garlic Naan', 2, 70), line('Butter Chicken', 1, 360)], 'Diana Evans'),
  order('ord-008', '2026-03-15T12:42:00.000Z', '8', 'new', 630, [line('Fish Curry', 1, 420), line('Steamed Rice', 1, 150), line('Papad', 2, 30)], 'Ethan Foster', 'Less spicy fish curry, extra gravy on the side'),
  order('ord-009', '2026-03-15T12:45:00.000Z', '4', 'new', 2530, [line('Paneer Butter Masala', 2, 320), line('Chicken Biryani', 1, 380), line('Butter Naan', 4, 60), line('Dal Makhani', 1, 280), line('Tandoori Chicken', 1, 450), line('Gulab Jamun', 3, 80), line('Mango Lassi', 2, 120), line('Masala Papad', 2, 50)], 'Fiona Garcia', 'Birthday celebration — please add a candle on the Gulab Jamun plate'),
  order('ord-010', '2026-03-15T12:47:00.000Z', '6', 'new', 640, [line('Chole Bhature', 2, 220), line('Sweet Lassi', 2, 100)], 'George Harris'),
  order('ord-011', '2026-03-15T12:50:00.000Z', '10', 'new', 790, [line('Mutton Rogan Josh', 1, 520), line('Laccha Paratha', 3, 70), line('Onion Raita', 1, 60)], 'Hannah Jackson', 'Gluten-free paratha if available, otherwise skip bread'),
  order('ord-012', '2026-03-15T12:52:00.000Z', '14', 'new', 400, [line('Aloo Gobi', 1, 240), line('Tandoori Roti', 4, 40)], 'Ian King'),
  order('ord-013', '2026-03-15T12:15:00.000Z', '11', 'preparing', 900, [line('Prawn Masala', 1, 580), line('Steamed Rice', 1, 150), line('Papad', 1, 30), line('Lemon Soda', 2, 70)], 'Judy Lee'),
  order('ord-014', '2026-03-15T12:18:00.000Z', '15', 'preparing', 1200, [line('Veg Thali', 3, 350), line('Buttermilk', 3, 50)], 'Kevin Martin', 'One thali without dairy — lactose intolerant guest'),
  order('ord-015', '2026-03-15T12:22:00.000Z', '13', 'preparing', 840, [line('Egg Biryani', 2, 300), line('Mirchi Ka Salan', 1, 120), line('Raita', 2, 60)], 'Laura Nelson'),
  order('ord-016', '2026-03-15T11:50:00.000Z', '2', 'served', 650, [line('Palak Paneer', 1, 290), line('Garlic Naan', 2, 70), line('Kheer', 2, 110)], 'Michael O\'Connor'),
  order('ord-017', '2026-03-15T11:40:00.000Z', '4', 'served', 700, [line('Kadai Chicken', 1, 380), line('Butter Naan', 3, 60), line('Pepsi', 2, 70)], 'Nancy Patel'),
  order('ord-018', '2026-03-15T11:35:00.000Z', '6', 'served', 490, [line('Mushroom Do Pyaza', 1, 310), line('Jeera Rice', 1, 180)], 'Oliver Quinn'),
  order('ord-019', '2026-03-15T12:55:00.000Z', '8', 'new', 1300, [line('Chicken Lollipop', 2, 280), line('Paneer 65', 1, 300), line('Sweet Corn Soup', 2, 180), line('Sprite', 2, 70)], 'Paula Ray', 'Serve soup first, then starters after 10 min gap'),
  order('ord-020', '2026-03-15T12:25:00.000Z', '3', 'preparing', 770, [line('Methi Malai Murg', 1, 400), line('Missi Roti', 3, 50), line('Dal Tadka', 1, 220)], 'Quinn Smith'),
];

// Compute initial table status from orders
const tablesWithActiveOrders = new Set(
  initialOrders.map((o) => parseInt(o.tableNo, 10))
);

export const initialTables: Table[] = Array.from({ length: 15 }, (_, i) => ({
  id: `table-${i + 1}`,
  number: i + 1,
  status: tablesWithActiveOrders.has(i + 1) ? 'active' as const : 'inactive' as const,
  seats: i % 3 === 0 ? 6 : i % 3 === 1 ? 4 : 2,
}));

export const analyticsData = {
  totalOrdersToday: 47,
  revenueToday: 38450,
  mostOrderedDish: 'Paneer Butter Masala',
  peakHours: '12:00 PM - 2:00 PM',
  ordersPerHour: [
    { hour: '9 AM', orders: 2 },
    { hour: '10 AM', orders: 5 },
    { hour: '11 AM', orders: 8 },
    { hour: '12 PM', orders: 14 },
    { hour: '1 PM', orders: 12 },
    { hour: '2 PM', orders: 6 },
    { hour: '3 PM', orders: 3 },
    { hour: '4 PM', orders: 4 },
    { hour: '5 PM', orders: 5 },
    { hour: '6 PM', orders: 9 },
    { hour: '7 PM', orders: 11 },
    { hour: '8 PM', orders: 13 },
    { hour: '9 PM', orders: 8 },
  ],
  revenueTrend: [
    { day: 'Mon', revenue: 32000 },
    { day: 'Tue', revenue: 28500 },
    { day: 'Wed', revenue: 35200 },
    { day: 'Thu', revenue: 31000 },
    { day: 'Fri', revenue: 42000 },
    { day: 'Sat', revenue: 48500 },
    { day: 'Sun', revenue: 38450 },
  ],
};