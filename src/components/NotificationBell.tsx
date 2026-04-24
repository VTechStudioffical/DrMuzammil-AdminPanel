import { Bell, Calendar, MessageSquare, FileText } from "lucide-react";

import { formatDistanceToNow } from "date-fns";
import { Link } from "@tanstack/react-router";

import { useNotifications } from "@/lib/notification-context";
import type { Notification } from "@/lib/notifications";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ICON_MAP = {
  calendar: Calendar,
  message: MessageSquare,
  file: FileText,
  bell: Bell,
};

export function NotificationBell() {
  const { notifications, unreadCount, clearAll, markAsRead } =
    useNotifications();

  const getIcon = (iconName: "calendar" | "message" | "file" | "bell") => {
    return ICON_MAP[iconName];
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-lg"
        >
          <Bell className="h-5 w-5" />

          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h3 className="font-semibold">Notifications</h3>
            <p className="text-xs text-gray-500">{unreadCount} unread</p>
          </div>

          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll}>
              Clear All
            </Button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              No notifications
            </div>
          ) : (
            notifications.map((notif: Notification) => {
              const Icon = getIcon(notif.icon);

              return (
                <div
                  key={notif.id}
                  className={cn(
                    "border-b px-4 py-3 hover:bg-gray-50",
                    !notif.read && "bg-blue-50",
                  )}
                  onClick={() => markAsRead(notif.id)}
                >
                  <div className="flex gap-3">
                    <div className="shrink-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                        <Icon className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{notif.title}</p>

                      <p className="mt-1 text-xs text-gray-500">
                        {notif.message}
                      </p>

                      <p className="mt-2 text-xs text-gray-400">
                        {formatDistanceToNow(notif.createdAt, {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>

                  {notif.actionUrl && (
                    <div className="mt-3">
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="w-full"
                      >
                        <Link to={notif.actionUrl}>
                          {notif.actionLabel || "View"}
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
