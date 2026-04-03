import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  Bell,
  ShoppingBag,
  ChefHat,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useMenuConfig } from '../context/MenuConfigContext';
import { useOrders } from '../context/OrdersContext';
import { useClickOutside } from '../hooks/useClickOutside';

const notifIconMap = {
  'new-order': { icon: ShoppingBag, bg: 'bg-primary/10', color: 'text-primary' },
  preparing: { icon: ChefHat, bg: 'bg-status-preparing-light', color: 'text-status-preparing' },
  served: { icon: CheckCircle2, bg: 'bg-status-served-light', color: 'text-status-served' },
};

interface Notification {
  id: string;
  type: 'new-order' | 'preparing' | 'served';
  title: string;
  description: string;
  createdAt: string;
  unread: boolean;
}

const notifRouteMap: Record<Notification['type'], string> = {
  'new-order': '/orders?filter=new',
  preparing: '/orders?filter=preparing',
  served: '/orders?filter=served',
};

function formatRelativeTime(isoTs: string): string {
  const ms = Date.now() - new Date(isoTs).getTime();
  const mins = Math.max(0, Math.floor(ms / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export function NotificationPopup() {
  const { branding } = useMenuConfig();
  const {
    notifications,
    markAllNotificationsRead,
    clearNotifications,
  } = useOrders();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const closePopup = (markRead: boolean) => {
    if (markRead) markAllNotificationsRead();
    setOpen(false);
  };

  useClickOutside(ref, () => {
    if (open) closePopup(true);
  }, open);

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          if (open) {
            closePopup(true);
            return;
          }
          setOpen(true);
        }}
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
                      closePopup(true);
                      navigate(notifRouteMap[notif.type]);
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
                        {formatRelativeTime(notif.createdAt)}
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
                  clearNotifications();
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