import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  Bell,
  ShoppingBag,
  AlertCircle,
  CheckCircle2,
  ChefHat,
  Clock,
} from 'lucide-react';
import { useMenuConfig } from '../context/MenuConfigContext';
import { useClickOutside } from '../hooks/useClickOutside';

const notifIconMap = {
  'new-order': { icon: ShoppingBag, bg: 'bg-primary/10', color: 'text-primary' },
  status: { icon: ChefHat, bg: 'bg-status-preparing-light', color: 'text-status-preparing' },
  alert: { icon: AlertCircle, bg: 'bg-danger-light', color: 'text-danger' },
  served: { icon: CheckCircle2, bg: 'bg-status-served-light', color: 'text-status-served' },
};

interface Notification {
  id: string;
  type: 'new-order' | 'status' | 'alert' | 'served';
  title: string;
  description: string;
  time: string;
  unread: boolean;
}

const initialNotifications: Notification[] = [
  { id: 'n1', type: 'new-order', title: 'New Order - Table 8', description: '3 items · ₹630', time: '2 min ago', unread: true },
  { id: 'n2', type: 'new-order', title: 'New Order - Table 7', description: '3 items · ₹1,200', time: '6 min ago', unread: true },
  { id: 'n3', type: 'new-order', title: 'New Order - Table 3', description: '3 items · ₹940', time: '10 min ago', unread: true },
  { id: 'n4', type: 'status', title: 'Order Ready - Table 5', description: 'Tandoori Chicken order is ready to serve', time: '15 min ago', unread: false },
  { id: 'n5', type: 'alert', title: 'Low Stock Alert', description: 'Paneer Butter Masala running low', time: '25 min ago', unread: false },
  { id: 'n6', type: 'served', title: 'Order Served - Table 2', description: 'All items delivered · ₹720', time: '35 min ago', unread: false },
  { id: 'n7', type: 'status', title: 'Order Preparing - Table 12', description: 'Veg Samosa (6x) started', time: '40 min ago', unread: false },
];

const notifRouteMap: Record<Notification['type'], string> = {
  'new-order': '/orders?filter=new',
  status: '/orders?filter=preparing',
  served: '/orders?filter=served',
  alert: '/menu',
};

export function NotificationPopup() {
  const { branding } = useMenuConfig();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useClickOutside(ref, () => setOpen(false), open);

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <Bell className="w-5 h-5 text-gray-500" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl border border-gray-100 shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-gray-50">
            <h3 className="text-sm text-gray-900">Notifications</h3>
            <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {unreadCount} new
            </span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const { icon: Icon, bg, color } = notifIconMap[notif.type];
                return (
                  <button
                    key={notif.id}
                    onClick={() => {
                      navigate(notifRouteMap[notif.type]);
                      setOpen(false);
                    }}
                    className={`w-full flex items-start gap-3 p-3 hover:bg-gray-50 transition-colors cursor-pointer text-left ${
                      notif.unread ? 'bg-primary/[0.02]' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${bg}`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm truncate ${notif.unread ? 'text-gray-900' : 'text-gray-600'}`}>
                          {notif.title}
                        </p>
                        {notif.unread && (
                          <span className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{notif.description.replace(/₹/g, branding.currency)}</p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-300">
                        <Clock className="w-3 h-3" />
                        {notif.time}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          {notifications.length > 0 && (
            <div className="p-2 border-t border-gray-50">
              <button
                onClick={() => {
                  setNotifications([]);
                  setOpen(false);
                }}
                className="w-full text-center text-xs text-primary hover:bg-primary/5 py-2 rounded-lg transition-colors cursor-pointer"
              >
                Clear Notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}