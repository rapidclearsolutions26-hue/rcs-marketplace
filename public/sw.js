self.addEventListener("push", function (event) {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    console.error("Push notification data error:", error);

    data = {
      title: "RCS Waste",
      message: event.data
        ? event.data.text()
        : "You have a new notification.",
    };
  }

  const title = data.title || "RCS Waste";

  const options = {
    body:
      data.message ||
      "You have a new notification.",

    icon: "/rcs-logo.jpg",

    badge: "/rcs-logo.jpg",

    tag:
      data.tag ||
      `rcs-notification-${Date.now()}`,

    data: {
      url:
        data.url ||
        "/customer/dashboard",

      job_id:
        data.job_id || null,
    },

    requireInteraction:
      Boolean(data.requireInteraction),

    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(
      title,
      options
    )
  );
});


self.addEventListener(
  "notificationclick",
  function (event) {
    event.notification.close();

    const notificationData =
      event.notification.data || {};

    let url =
      notificationData.url ||
      "/customer/dashboard";

    if (
      notificationData.job_id
    ) {
      url =
        `/customer/jobs/${notificationData.job_id}`;
    }

    event.waitUntil(
      clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      }).then(function (clientList) {

        for (const client of clientList) {
          if (
            "focus" in client
          ) {
            client.navigate(url);
            return client.focus();
          }
        }

        if (
          clients.openWindow
        ) {
          return clients.openWindow(url);
        }
      })
    );
  }
);