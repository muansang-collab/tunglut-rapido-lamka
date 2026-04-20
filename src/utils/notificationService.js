export function createNotification({
  type = "info",
  title,
  message,
  role = "system",
}) {
  return {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type, // success | error | warning | info
    title,
    message,
    role,
    read: false,
    createdAt: new Date().toLocaleString(),
  };
}

export function pushNotification(setAppData, notification) {
  setAppData((prev) => ({
    ...prev,
    notifications: [notification, ...(prev.notifications || [])],
  }));
}